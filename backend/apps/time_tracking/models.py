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
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import date

class TimeEntryViewSet(viewsets.ModelViewSet):
    serializer_class = TimeEntrySerializer
    permission_classes = [IsEmployee]
    filterset_fields = ['employee', 'date', 'is_remote']
    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = TimeEntry.objects.select_related('employee')
        if tenant_id:
            qs = qs.filter(employee__organization_id=tenant_id)
        
        # Filter by employee if not manager
        if not self.request.user.is_staff and hasattr(self.request.user, 'profile'):
            if self.request.user.profile.role == 'employee':
                qs = qs.filter(employee__user=self.request.user)
                
        return qs

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's time entry for current employee."""
        if not hasattr(request.user, 'profile') or not hasattr(request.user.profile, 'employee'):
            return Response({'error': 'Employee profile not found'}, status=400)
            
        today = date.today()
        entry = TimeEntry.objects.filter(employee=request.user.profile.employee, date=today).first()
        if not entry:
            return Response(None, status=204)
        
        serializer = self.get_serializer(entry)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def toggle(self, request):
        """Toggle check-in/check-out for today."""
        if not hasattr(request.user, 'profile') or not hasattr(request.user.profile, 'employee'):
            return Response({'error': 'Employee profile not found'}, status=400)
            
        emp = request.user.profile.employee
        today = date.today()
        now = timezone.now().time()
        
        entry, created = TimeEntry.objects.get_or_create(
            employee=emp, date=today,
            defaults={'check_in': now}
        )
        
        if not created:
            if not entry.check_out:
                entry.check_out = now
                entry.save()
            else:
                return Response({'error': 'Déjà pointé pour aujourd\'hui.'}, status=400)
                
        serializer = self.get_serializer(entry)
        return Response(serializer.data)

class OvertimeViewSet(viewsets.ModelViewSet):
    serializer_class = OvertimeSerializer
    permission_classes = [IsEmployee]
    filterset_fields = ['employee', 'status']
    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = OvertimeRequest.objects.select_related('employee')
        return qs.filter(employee__organization_id=tenant_id) if tenant_id else qs
