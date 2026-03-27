"""Konggest — Payroll Views"""
from rest_framework import viewsets, serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from core.permissions import IsHRManager
from .models import PayrollPeriod, Payslip, PayrollItem


class PayrollPeriodSerializer(serializers.ModelSerializer):
    payslip_count = serializers.SerializerMethodField()
    class Meta:
        model = PayrollPeriod
        fields = ['id', 'name', 'start_date', 'end_date', 'is_closed', 'payslip_count', 'created_at']
    def get_payslip_count(self, obj):
        return obj.payslips.count()


class PayrollItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollItem
        fields = ['id', 'name', 'item_type', 'amount', 'is_percentage']


class PayslipSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    period_name = serializers.CharField(source='period.name', read_only=True)
    items = PayrollItemSerializer(many=True, read_only=True)
    class Meta:
        model = Payslip
        fields = ['id', 'employee', 'employee_name', 'period', 'period_name',
                  'gross_salary', 'total_deductions', 'total_bonuses', 'net_salary',
                  'status', 'notes', 'items', 'created_at']


class PayrollPeriodViewSet(viewsets.ModelViewSet):
    serializer_class = PayrollPeriodSerializer
    permission_classes = [IsHRManager]
    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = PayrollPeriod.objects.all()
        return qs.filter(organization_id=tenant_id) if tenant_id else qs
    def perform_create(self, serializer):
        serializer.save(organization_id=self.request.tenant_id)


class PayslipViewSet(viewsets.ModelViewSet):
    serializer_class = PayslipSerializer
    permission_classes = [IsHRManager]
    filterset_fields = ['period', 'status', 'employee']
    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = Payslip.objects.select_related('employee', 'period').prefetch_related('items')
        if tenant_id:
            qs = qs.filter(employee__organization_id=tenant_id)
        # Non-managers see only their own payslips
        if hasattr(self.request.user, 'profile') and self.request.user.profile.role == 'employee':
            qs = qs.filter(employee__user=self.request.user)
        return qs

    @action(detail=False, methods=['post'], url_path='generate')
    def generate_for_period(self, request):
        """Logic to generate draft payslips for all active employees in a period."""
        period_id = request.data.get('period')
        if not period_id:
            return Response({'error': 'Period ID is required'}, status=400)
        
        from apps.employees.models import Employee
        from .models import PayrollPeriod
        
        try:
            period = PayrollPeriod.objects.get(id=period_id, organization_id=self.request.tenant_id)
        except PayrollPeriod.DoesNotExist:
            return Response({'error': 'Period not found'}, status=404)

        active_employees = Employee.objects.filter(
            organization_id=self.request.tenant_id,
            status='active'
        )
        
        created_count = 0
        for emp in active_employees:
            # Basic logic: create a draft payslip based on base salary
            payslip, created = Payslip.objects.get_or_create(
                employee=emp,
                period=period,
                defaults={
                    'gross_salary': emp.salary,
                    'net_salary': emp.salary * 0.78, # Simple 22% deduction estimate
                    'total_deductions': emp.salary * 0.22,
                    'status': 'draft'
                }
            )
            if created:
                created_count += 1
                
        return Response({'status': f'{created_count} payslips generated.'})
