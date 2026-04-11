"""Konggest — Leaves Views"""
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from core.permissions import IsManager, IsEmployee
from core.pagination import StandardPagination
from core.cache import cache_response
from apps.accounts.utils import log_action
from apps.time_tracking.views import _broadcast_realtime_async

from .models import LeaveType, LeaveRequest, LeaveBalance
from .serializers import LeaveTypeSerializer, LeaveRequestSerializer, LeaveBalanceSerializer
import csv
from django.http import StreamingHttpResponse


class LeaveTypeViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveTypeSerializer
    permission_classes = [IsManager]
    pagination_class = StandardPagination

    @cache_response(timeout=60 * 60 * 24)  # Cache 24h
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = LeaveType.objects.all()
        if tenant_id:
            qs = qs.filter(organization_id=tenant_id)
        return qs

    def perform_create(self, serializer):
        tenant_id = getattr(self.request, 'tenant_id', None)
        if not tenant_id:
            try:
                tenant_id = self.request.user.profile.organization_id
            except Exception:
                pass
        
        if not tenant_id:
            raise serializers.ValidationError({"error": "Organisation non identifiée."})
            
        serializer.save(organization_id=tenant_id)


import csv
from django.http import HttpResponse

class LeaveRequestViewSet(viewsets.ModelViewSet):
    """CRUD for leave requests."""
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsEmployee]
    pagination_class = StandardPagination
    filterset_fields = ['status', 'employee', 'leave_type']
    ordering_fields = ['start_date', 'created_at']

    @cache_response(timeout=60)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Export leave requests as CSV (Streaming)."""
        qs = self.filter_queryset(self.get_queryset())
        
        class Echo:
            def write(self, value):
                return value
        
        def iter_items():
            yield ['ID', 'Employé', 'Type', 'Début', 'Fin', 'Jours', 'Statut']
            for req in qs.iterator(chunk_size=1000):
                yield [
                    str(req.id), req.employee.full_name, req.leave_type.name,
                    str(req.start_date), str(req.end_date), str(req.days_count), req.status
                ]
                
        writer = csv.writer(Echo())
        response = StreamingHttpResponse(
            (writer.writerow(row) for row in iter_items()),
            content_type="text/csv"
        )
        response['Content-Disposition'] = 'attachment; filename="leaves_export.csv"'
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

    def perform_create(self, serializer):
        # L5: Vérification de solde
        employee = serializer.validated_data.get('employee')
        leave_type = serializer.validated_data.get('leave_type')
        days_count = serializer.validated_data.get('days_count', 0)
        start_date = serializer.validated_data.get('start_date')
        
        year = start_date.year if start_date else timezone.now().year
        
        if leave_type.is_paid:
            balance = LeaveBalance.objects.filter(
                employee=employee, leave_type=leave_type, year=year
            ).first()
            if not balance or balance.remaining_days < days_count:
                raise serializers.ValidationError({"error": f"Solde insuffisant. Jours demandés: {days_count}, restants: {balance.remaining_days if balance else 0}"})
                
        serializer.save()

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
        
        # Deduct used days if paid
        if leave.leave_type.is_paid:
            balance, _ = LeaveBalance.objects.get_or_create(
                employee=leave.employee,
                leave_type=leave.leave_type,
                year=leave.start_date.year
            )
            balance.used_days += leave.days_count
            balance.save()

        log_action(request.user, request.user.profile.organization, 'update', 'leave', leave.id, {'status': 'approved'})
        
        # L4 - Realtime Broadcast
        tenant_id = str(request.user.profile.organization_id) if hasattr(request.user, 'profile') else 'default'
        _broadcast_realtime_async(tenant_id, 'leave.approved', {'leave_id': leave.id, 'employee_id': leave.employee.id})
        
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
        log_action(request.user, request.user.profile.organization, 'update', 'leave', leave.id, {'status': 'rejected', 'reason': leave.rejection_reason})
        
        # L4 - Realtime Broadcast
        tenant_id = str(request.user.profile.organization_id) if hasattr(request.user, 'profile') else 'default'
        _broadcast_realtime_async(tenant_id, 'leave.rejected', {'leave_id': leave.id, 'employee_id': leave.employee.id})
        
        return Response({'status': 'rejected'})


class LeaveBalanceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LeaveBalanceSerializer
    permission_classes = [IsEmployee]

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = LeaveBalance.objects.select_related('leave_type', 'employee')
        if tenant_id:
            qs = qs.filter(employee__organization_id=tenant_id)
        return qs
