"""Konggest — Payroll Models"""
from django.db import models
from apps.accounts.models import Organization
from apps.employees.models import Employee


class PayrollPeriod(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='payroll_periods')
    name = models.CharField(max_length=50, verbose_name="Période")
    start_date = models.DateField()
    end_date = models.DateField()
    is_closed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Période de Paie"
        ordering = ['-start_date']

    def __str__(self):
        return self.name


class Payslip(models.Model):
    STATUS_CHOICES = [('draft', 'Brouillon'), ('validated', 'Validé'), ('paid', 'Payé')]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='payslips')
    period = models.ForeignKey(PayrollPeriod, on_delete=models.CASCADE, related_name='payslips')
    gross_salary = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Salaire brut")
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Cotisations")
    total_bonuses = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Primes")
    net_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Salaire net")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Fiche de Paie"
        unique_together = ['employee', 'period']
        ordering = ['-period__start_date']

    def __str__(self):
        return f"{self.employee.full_name} - {self.period.name}"


class PayrollItem(models.Model):
    """Individual line items on a payslip (bonuses, deductions)."""
    TYPE_CHOICES = [('bonus', 'Prime'), ('deduction', 'Retenue')]

    payslip = models.ForeignKey(Payslip, on_delete=models.CASCADE, related_name='items')
    name = models.CharField(max_length=100)
    item_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_percentage = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Élément de Paie"

    def __str__(self):
        return f"{self.name}: {self.amount}"
