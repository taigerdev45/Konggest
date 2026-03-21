"""Konggest — Employees Views"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from core.permissions import IsHRManager, IsManager, IsSameTenant
from core.cache import cache_response, invalidate_cache
from .models import Employee, Department, Position
from .serializers import (
    EmployeeListSerializer, EmployeeDetailSerializer,
    DepartmentSerializer, PositionSerializer
)


class EmployeeViewSet(viewsets.ModelViewSet):
    """CRUD for employees (tenant-scoped)."""
    permission_classes = [IsManager, IsSameTenant]
    filterset_fields = ['department', 'status', 'contract_type']
    search_fields = ['first_name', 'last_name', 'employee_id', 'email']
    ordering_fields = ['last_name', 'hire_date', 'department']

    def get_serializer_class(self):
        if self.action == 'list':
            return EmployeeListSerializer
        return EmployeeDetailSerializer

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = Employee.objects.select_related('department', 'position', 'manager')
        if tenant_id:
            qs = qs.filter(organization_id=tenant_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(organization_id=self.request.tenant_id)
        invalidate_cache(self.request.tenant_id, 'employees')

    def perform_update(self, serializer):
        serializer.save()
        invalidate_cache(self.request.tenant_id, 'employees')

    def perform_destroy(self, instance):
        instance.delete()
        invalidate_cache(self.request.tenant_id, 'employees')

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get employee statistics for dashboard."""
        qs = self.get_queryset()
        return Response({
            'total': qs.count(),
            'active': qs.filter(status='active').count(),
            'on_leave': qs.filter(status='on_leave').count(),
            'by_department': list(
                qs.filter(status='active')
                .values('department__name')
                .annotate(count=models.Count('id'))
                .order_by('-count')[:10]
            ),
            'by_contract': list(
                qs.values('contract_type')
                .annotate(count=models.Count('id'))
            ),
        })


class DepartmentViewSet(viewsets.ModelViewSet):
    """CRUD for departments."""
    serializer_class = DepartmentSerializer
    permission_classes = [IsHRManager]

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = Department.objects.all()
        if tenant_id:
            qs = qs.filter(organization_id=tenant_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(organization_id=self.request.tenant_id)


# Import Count for stats action
from django.db import models
