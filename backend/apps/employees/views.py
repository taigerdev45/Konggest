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
from apps.accounts.utils import log_action


from django.http import HttpResponse
import csv

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

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Export employees list as CSV."""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="employees_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['ID', 'Matricule', 'Prénom', 'Nom', 'Email', 'Département', 'Poste', 'Statut', 'Date Embauche'])
        
        for emp in self.get_queryset():
            writer.writerow([
                emp.id, emp.employee_id, emp.first_name, emp.last_name, emp.email,
                emp.department.name if emp.department else 'N/A',
                emp.position.title if emp.position else 'N/A',
                emp.status, emp.hire_date
            ])
            
        return response

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = Employee.objects.select_related('department', 'position', 'manager')
        if tenant_id:
            qs = qs.filter(organization_id=tenant_id)
        return qs

    def perform_create(self, serializer):
        emp = serializer.save(organization_id=self.request.tenant_id)
        invalidate_cache(self.request.tenant_id, 'employees')
        log_action(self.request.user, self.request.user.profile.organization, 'create', 'employee', emp.id, {'full_name': emp.full_name})

    def perform_update(self, serializer):
        emp = serializer.save()
        invalidate_cache(self.request.tenant_id, 'employees')
        log_action(self.request.user, self.request.user.profile.organization, 'update', 'employee', emp.id, {'full_name': emp.full_name})

    def perform_destroy(self, instance):
        emp_id = instance.id
        emp_name = instance.full_name
        instance.delete()
        invalidate_cache(self.request.tenant_id, 'employees')
        log_action(self.request.user, self.request.user.profile.organization, 'delete', 'employee', emp_id, {'full_name': emp_name})

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get the current user's employee profile."""
        try:
            employee = Employee.objects.get(user=request.user)
            serializer = EmployeeDetailSerializer(employee)
            return Response(serializer.data)
        except Employee.DoesNotExist:
            return Response({'error': 'No employee profile found for this user.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get employee statistics for dashboard with Gabonese context."""
        qs = self.get_queryset()
        total = qs.count()
        terminated = qs.filter(status='terminated').count()
        
        # Simple turnover calculation (Terminated / Total)
        turnover = round((terminated / total * 100), 2) if total > 0 else 0
        
        return Response({
            'total': total,
            'active': qs.filter(status='active').count(),
            'on_leave': qs.filter(status='on_leave').count(),
            'turnover_rate': turnover,
            'by_department': list(
                qs.filter(status='active')
                .values('department__name')
                .annotate(count=models.Count('id'))
                .order_by('-count')[:10]
            ),
            'by_site': list(
                qs.values('site_location')
                .annotate(count=models.Count('id'))
                .order_by('-count')
            ),
            'by_contract': list(
                qs.values('contract_type')
                .annotate(count=models.Count('id'))
            ),
            'expat_ratio': round((qs.filter(is_expat=True).count() / total * 100), 1) if total > 0 else 0
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


class PositionViewSet(viewsets.ModelViewSet):
    """CRUD for positions."""
    serializer_class = PositionSerializer
    permission_classes = [IsHRManager]

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = Position.objects.all()
        if tenant_id:
            qs = qs.filter(organization_id=tenant_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(organization_id=self.request.tenant_id)


# Import Count for stats action
from django.db import models
