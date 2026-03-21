"""Konggest — Leaves (Absences/Congés) Models"""
from django.db import models
from apps.accounts.models import Organization
from apps.employees.models import Employee


class LeaveType(models.Model):
    """Types of leave: paid, sick, maternity, etc."""
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='leave_types')
    name = models.CharField(max_length=100, verbose_name="Type de congé")
    code = models.CharField(max_length=10)
    days_per_year = models.IntegerField(default=0, verbose_name="Jours/an")
    is_paid = models.BooleanField(default=True, verbose_name="Payé")
    requires_approval = models.BooleanField(default=True)
    color = models.CharField(max_length=7, default='#3B82F6')
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Type de Congé"
        unique_together = ['organization', 'code']

    def __str__(self):
        return self.name


class LeaveRequest(models.Model):
    """Leave/absence request."""
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('approved', 'Approuvé'),
        ('rejected', 'Refusé'),
        ('cancelled', 'Annulé'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_requests')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    start_date = models.DateField(verbose_name="Date de début")
    end_date = models.DateField(verbose_name="Date de fin")
    days_count = models.DecimalField(max_digits=4, decimal_places=1, verbose_name="Nombre de jours")
    reason = models.TextField(blank=True, verbose_name="Motif")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_leaves')
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Demande de Congé"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['employee', '-start_date']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.employee.full_name} - {self.leave_type.name} ({self.start_date})"


class LeaveBalance(models.Model):
    """Track leave balance per employee per type per year."""
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_balances')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    year = models.IntegerField()
    total_days = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    used_days = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    carried_over = models.DecimalField(max_digits=5, decimal_places=1, default=0)

    class Meta:
        verbose_name = "Solde de Congé"
        unique_together = ['employee', 'leave_type', 'year']

    @property
    def remaining_days(self):
        return self.total_days + self.carried_over - self.used_days

    def __str__(self):
        return f"{self.employee.full_name} - {self.leave_type.name}: {self.remaining_days}j restants"
