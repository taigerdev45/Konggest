"""Konggest — Time Tracking Models"""
from django.db import models
from datetime import datetime, timedelta
from apps.employees.models import Employee


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
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Pointage"
        verbose_name_plural = "Pointages"
        unique_together = ['employee', 'date']
        ordering = ['-date', '-created_at']

    @property
    def worked_hours(self):
        """Calculate worked hours excluding break time."""
        if self.check_in and self.check_out:
            ci = datetime.combine(self.date, self.check_in)
            co = datetime.combine(self.date, self.check_out)
            delta = co - ci - timedelta(minutes=self.break_minutes)
            hours = delta.total_seconds() / 3600
            return round(max(hours, 0), 2)  # Don't return negative hours
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

    def __str__(self):
        return f"{self.employee.full_name} - {self.date} ({self.hours}h)"
