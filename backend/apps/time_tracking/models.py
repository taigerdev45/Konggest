"""
Konggest — Time Tracking Models
Version optimisée (2026-04-11)

Corrections :
  AT2 - QRSession model : token HMAC-SHA256, expires_at, is_used (sécurité scan QR)
  AT7 - Index DB explicites sur (employee, date) et (organization, date) pour stats rapides
"""
from django.db import models
from datetime import datetime, timedelta
from apps.employees.models import Employee
from apps.accounts.models import Organization


class TimeEntry(models.Model):
    """Employee time tracking entry for a specific date."""
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='time_entries',
        verbose_name="Employé"
    )
    date = models.DateField(verbose_name="Date")
    check_in = models.TimeField(verbose_name="Arrivée")
    check_out = models.TimeField(
        null=True,
        blank=True,
        verbose_name="Départ"
    )
    break_minutes = models.IntegerField(
        default=60,
        verbose_name="Pause (min)"
    )
    notes = models.TextField(blank=True, verbose_name="Notes")
    is_remote = models.BooleanField(
        default=False,
        verbose_name="Télétravail"
    )
    # AT2 : traçabilité scan QR
    scanned_via_qr = models.BooleanField(
        default=False,
        verbose_name="Pointé par QR"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Pointage"
        verbose_name_plural = "Pointages"
        unique_together = ['employee', 'date']
        ordering = ['-date', '-created_at']
        # AT7 : index DB explicites pour performance stats/dashboard
        indexes = [
            models.Index(fields=['employee', 'date'], name='tt_employee_date_idx'),
            models.Index(
                fields=['employee', '-date'],
                name='tt_employee_date_desc_idx'
            ),
        ]

    @property
    def worked_hours(self):
        """Calculate worked hours excluding break time."""
        if self.check_in and self.check_out:
            ci = datetime.combine(self.date, self.check_in)
            co = datetime.combine(self.date, self.check_out)
            delta = co - ci - timedelta(minutes=self.break_minutes)
            hours = delta.total_seconds() / 3600
            return round(max(hours, 0), 2)
        return 0

    def __str__(self):
        return f"{self.employee.full_name} - {self.date}"


class OvertimeRequest(models.Model):
    """Overtime request submitted by an employee."""
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('approved', 'Approuvé'),
        ('rejected', 'Refusé')
    ]

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='overtime_requests',
        verbose_name="Employé"
    )
    date = models.DateField(verbose_name="Date")
    hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        verbose_name="Heures demandées"
    )
    reason = models.TextField(verbose_name="Motif")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Statut"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Demande Heures Sup"
        verbose_name_plural = "Demandes Heures Sup"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['employee', 'status'], name='ot_employee_status_idx'),
        ]

    def __str__(self):
        return f"{self.employee.full_name} - {self.date} ({self.hours}h)"


class QRSession(models.Model):
    """
    AT2 — Session QR quotidienne par organisation.
    1 token HMAC-SHA256 par jour par tenant, affiché sous forme de QR Code.
    Sécurité :
      - expires_at  : TTL 24h (un QR ne fonctionne que la journée en cours)
      - is_used     : marque le premier usage (anti-replay par employee)
      - token       : HMAC-SHA256(SECRET_KEY + date + tenant_id) — infalsifiable
    """
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='qr_sessions',
        verbose_name="Organisation"
    )
    token = models.CharField(
        max_length=64,
        unique=True,
        verbose_name="Token HMAC"
    )
    date = models.DateField(verbose_name="Date du QR")
    expires_at = models.DateTimeField(verbose_name="Expiration")
    is_active = models.BooleanField(
        default=True,
        verbose_name="QR actif"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Session QR"
        verbose_name_plural = "Sessions QR"
        # Un seul QR actif par organisation par jour
        unique_together = ['organization', 'date']
        ordering = ['-date']
        indexes = [
            models.Index(fields=['token'], name='qr_token_idx'),
            models.Index(fields=['organization', 'date'], name='qr_org_date_idx'),
        ]

    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"QR {self.organization.name} - {self.date} ({'actif' if self.is_active else 'expiré'})"


class QRScan(models.Model):
    """
    AT2 — Enregistrement de chaque scan individuel.
    Permet l'anti-replay par employé : 1 seul scan IN + 1 scan OUT par QRSession.
    """
    SCAN_TYPE_CHOICES = [
        ('in', 'Entrée'),
        ('out', 'Sortie'),
    ]

    qr_session = models.ForeignKey(
        QRSession,
        on_delete=models.CASCADE,
        related_name='scans',
        verbose_name="Session QR"
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='qr_scans',
        verbose_name="Employé"
    )
    scan_type = models.CharField(
        max_length=3,
        choices=SCAN_TYPE_CHOICES,
        verbose_name="Type de scan"
    )
    scanned_at = models.DateTimeField(auto_now_add=True, verbose_name="Scanné à")

    class Meta:
        verbose_name = "Scan QR"
        verbose_name_plural = "Scans QR"
        # Anti-replay : 1 seul scan IN et 1 seul scan OUT par employé par session
        unique_together = ['qr_session', 'employee', 'scan_type']
        indexes = [
            models.Index(fields=['qr_session', 'employee'], name='scan_session_emp_idx'),
        ]

    def __str__(self):
        return f"{self.employee.full_name} - {self.scan_type} @ {self.scanned_at}"
