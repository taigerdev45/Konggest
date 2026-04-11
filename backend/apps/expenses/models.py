from django.db import models
from apps.employees.models import Employee
from apps.accounts.models import Organization

class ExpenseCategory(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='expense_categories')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.organization.name})"

class Expense(models.Model):
    STATUS_CHOICES = (
        ('pending', 'En attente'),
        ('approved', 'Approuvé'),
        ('rejected', 'Refusé'),
    )

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='expenses')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='expenses')
    category = models.ForeignKey(ExpenseCategory, on_delete=models.SET_NULL, null=True, blank=True)
    
    amount = models.DecimalField(max_digits=12, decimal_places=2, help_text="Montant en FCFA")
    date = models.DateField(verbose_name="Date de la dépense")
    reason = models.CharField(max_length=255, verbose_name="Motif")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    attachment_url = models.URLField(max_length=1024, blank=True, null=True, help_text="URL locale ou Supabase")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['organization', 'status'], name='expense_org_status_idx'),
            models.Index(fields=['employee', '-date']),
        ]

    def __str__(self):
        return f"Expense {self.id} - {self.employee.user.get_full_name()} - {self.amount} FCFA"
