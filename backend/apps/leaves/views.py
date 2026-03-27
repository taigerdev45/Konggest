"""Konggest — Leaves Views"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from core.permissions import IsManager, IsEmployee
from .models import LeaveType, LeaveRequest, LeaveBalance
from .serializers import LeaveTypeSerializer, LeaveRequestSerializer, LeaveBalanceSerializer


class LeaveTypeViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveTypeSerializer
    permission_classes = [IsManager]

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = LeaveType.objects.all()
        if tenant_id:
            qs = qs.filter(organization_id=tenant_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(organization_id=self.request.tenant_id)


import csv
from django.http import HttpResponse

class LeaveRequestViewSet(viewsets.ModelViewSet):
    """CRUD for leave requests."""
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsEmployee]
    filterset_fields = ['status', 'employee', 'leave_type']
    ordering_fields = ['start_date', 'created_at']

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Export leave requests as CSV."""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="leaves_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['ID', 'Employé', 'Type', 'Début', 'Fin', 'Jours', 'Statut'])
        
        for req in self.get_queryset():
            writer.writerow([
                req.id, req.employee.full_name, req.leave_type.name,
                req.start_date, req.end_date, req.days_count, req.status
            ])
            
        return response

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = LeaveRequest.objects.select_related('employee', 'leave_type', 'approved_by')
        if tenant_id:
            qs = qs.filter(employee__organization_id=tenant_id)
        # Non-managers only see their own
        if hasattr(self.request.user, 'profile') and self.request.user.profile.role == 'employee':
            qs = qs.filter(employee__user=self.request.user)
        return qs

    @action(detail=True, methods=['post'], permission_classes=[IsManager])
    def approve(self, request, pk=None):
        leave = self.get_object()
        leave.status = 'approved'
        # Get employee profile if exists, otherwise it's a staff/admin without profile
        from apps.employees.models import Employee
        try:
            leave.approved_by = Employee.objects.get(user=request.user)
        except Employee.DoesNotExist:
            leave.approved_by = None
        leave.approved_at = timezone.now()
        leave.save()
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'], permission_classes=[IsManager])
    def reject(self, request, pk=None):
        leave = self.get_object()
        leave.status = 'rejected'
        leave.rejection_reason = request.data.get('reason', '')
        # Get employee profile if exists
        from apps.employees.models import Employee
        try:
            leave.approved_by = Employee.objects.get(user=request.user)
        except Employee.DoesNotExist:
            leave.approved_by = None
        leave.approved_at = timezone.now()
        leave.save()
        return Response({'status': 'rejected'})


class LeaveBalanceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LeaveBalanceSerializer
    permission_classes = [IsEmployee]

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = LeaveBalance.objects.select_related('leave_type')
        if tenant_id:
            qs = qs.filter(employee__organization_id=tenant_id)
        return qs
