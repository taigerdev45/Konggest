from django.db import models
from apps.accounts.models import Organization
from apps.employees.models import Employee

class ShiftTemplate(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='shift_templates')
    name = models.CharField(max_length=100) # e.g. "Matin"
    start_time = models.TimeField()
    end_time = models.TimeField()
    color_code = models.CharField(max_length=20, default="#3B82F6") # e.g. Tailwind Blue
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'shift_template'
        unique_together = ['organization', 'name']

    def __str__(self):
        return f"{self.name} ({self.start_time}-{self.end_time})"

class Schedule(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Brouillon'),
        ('published', 'Publié'),
    )
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='schedules')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='schedules')
    
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'schedule'
        indexes = [
            models.Index(fields=['organization', 'employee', 'date']),
            models.Index(fields=['organization', 'date', 'status']),
        ]

    def __str__(self):
        return f"{self.employee} - {self.date} [{self.status}]"
