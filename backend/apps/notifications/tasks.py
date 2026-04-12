"""Konggest — Notifications Celery Tasks"""
from celery import shared_task
from django.core.mail import send_mail
from django.utils import timezone
from django.contrib.auth.models import User
from datetime import timedelta
from .models import Notification


@shared_task(bind=True, max_retries=3)
def send_email_task(self, user_id, subject, message):
    """
    Sends an email notification to a user.
    Retries up to 3 times in case of SMTP failure.
    """
    try:
        user = User.objects.get(id=user_id)
        if not user.email:
            return "User has no email"
            
        send_mail(
            subject=f"Konggest — {subject}",
            message=message,
            from_email=None,  # Uses DEFAULT_FROM_EMAIL from settings
            recipient_list=[user.email],
            fail_silently=False,
        )
        return f"Email sent to {user.email}"
    except User.DoesNotExist:
        return f"User {user_id} not found"
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


@shared_task
def cleanup_old_notifications():
    """
    Deletes read notifications that are older than 14 days.
    Keeps the DB lean (Optimisation Niveau 2).
    """
    cutoff = timezone.now() - timedelta(days=14)
    deleted_count, _ = Notification.objects.filter(
        is_read=True, 
        created_at__lt=cutoff
    ).delete()
    return f"Deleted {deleted_count} old read notifications"
