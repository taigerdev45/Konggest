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


class LeaveRequestViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsEmployee]
    filterset_fields = ['status', 'employee', 'leave_type']
    ordering_fields = ['start_date', 'created_at']

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
        leave.approved_by = request.user.employee
        leave.approved_at = timezone.now()
        leave.save()
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'], permission_classes=[IsManager])
    def reject(self, request, pk=None):
        leave = self.get_object()
        leave.status = 'rejected'
        leave.rejection_reason = request.data.get('reason', '')
        leave.approved_by = request.user.employee
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
