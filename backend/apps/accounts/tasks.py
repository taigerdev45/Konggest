"""Konggest — Accounts Celery Tasks"""
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum
from .models import Organization, AuditLog, LoginAttempt, Invoice
from .services import SaaSProvisioningService, BillingService


@shared_task
def cleanup_old_logs():
    """
    Deletes logs older than 14 days to keep DB performance high.
    (Optimisation Niveau 2)
    """
    cutoff = timezone.now() - timedelta(days=14)
    
    # Audit Logs
    audit_deleted, _ = AuditLog.objects.filter(created_at__lt=cutoff).delete()
    
    # Login Attempts
    login_deleted, _ = LoginAttempt.objects.filter(created_at__lt=cutoff).delete()
    
    return f"Logs Cleaned: {audit_deleted} audit entries, {login_deleted} login attempts deleted."


@shared_task
def generate_monthly_invoices():
    """
    Generates invoices for all active organizations.
    Run on the 1st of each month.
    """
    today = timezone.now().date()
    first_of_month = today.replace(day=1)
    last_day_prev_month = first_of_month - timedelta(days=1)
    
    active_orgs = Organization.objects.filter(
        subscription_status='active',
        is_active=True
    )
    
    created_count = 0
    for org in active_orgs:
        amount = BillingService.PLAN_PRICES.get(org.plan, 0)
        if amount <= 0:
            continue
            
        invoice_num = f"INV-{org.slug.upper()}-{today.strftime('%Y%m')}"
        
        # Avoid duplicates
        if Invoice.objects.filter(invoice_number=invoice_num).exists():
            continue
            
        Invoice.objects.create(
            organization=org,
            invoice_number=invoice_num,
            amount=amount,
            period_start=first_of_month,
            period_end=first_of_month + timedelta(days=30), # Approximation
            due_date=today + timedelta(days=15),
            status='pending'
        )
        created_count += 1
        
    return f"Generated {created_count} invoices for {today.strftime('%B %Y')}"


@shared_task(bind=True, max_retries=3)
def async_platform_staff_invite(self, email, full_name, role_slug):
    """Asynchronous wrapper for Supabase + Django staff creation."""
    try:
        SaaSProvisioningService.create_platform_staff(email, full_name, role_slug)
        return f"Staff {email} invited successfully."
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
