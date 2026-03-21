"""Konggest — Time Tracking Models & Views"""
from django.db import models
from rest_framework import viewsets, serializers
from apps.employees.models import Employee
from core.permissions import IsEmployee


class TimeEntry(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='time_entries')
    date = models.DateField()
    check_in = models.TimeField(verbose_name="Arrivée")
    check_out = models.TimeField(null=True, blank=True, verbose_name="Départ")
    break_minutes = models.IntegerField(default=60, verbose_name="Pause (min)")
    notes = models.TextField(blank=True)
    is_remote = models.BooleanField(default=False, verbose_name="Télétravail")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Pointage"
        unique_together = ['employee', 'date']
        ordering = ['-date']

    @property
    def worked_hours(self):
        if self.check_in and self.check_out:
            from datetime import datetime, timedelta
            ci = datetime.combine(self.date, self.check_in)
            co = datetime.combine(self.date, self.check_out)
            delta = co - ci - timedelta(minutes=self.break_minutes)
            return round(delta.total_seconds() / 3600, 2)
        return 0

    def __str__(self):
        return f"{self.employee.full_name} - {self.date}"


class OvertimeRequest(models.Model):
    STATUS_CHOICES = [('pending', 'En attente'), ('approved', 'Approuvé'), ('rejected', 'Refusé')]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='overtime_requests')
    date = models.DateField()
    hours = models.DecimalField(max_digits=4, decimal_places=1)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Demande Heures Sup"
        ordering = ['-created_at']


# ─── Serializers ───
class TimeEntrySerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    worked_hours = serializers.FloatField(read_only=True)
    class Meta:
        model = TimeEntry
        fields = ['id', 'employee', 'employee_name', 'date', 'check_in', 'check_out',
                  'break_minutes', 'worked_hours', 'notes', 'is_remote', 'created_at']

class OvertimeSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    class Meta:
        model = OvertimeRequest
        fields = ['id', 'employee', 'employee_name', 'date', 'hours', 'reason', 'status', 'created_at']


# ─── Views ───
class TimeEntryViewSet(viewsets.ModelViewSet):
    serializer_class = TimeEntrySerializer
    permission_classes = [IsEmployee]
    filterset_fields = ['employee', 'date', 'is_remote']
    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = TimeEntry.objects.select_related('employee')
        return qs.filter(employee__organization_id=tenant_id) if tenant_id else qs

class OvertimeViewSet(viewsets.ModelViewSet):
    serializer_class = OvertimeSerializer
    permission_classes = [IsEmployee]
    filterset_fields = ['employee', 'status']
    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = OvertimeRequest.objects.select_related('employee')
        return qs.filter(employee__organization_id=tenant_id) if tenant_id else qs
