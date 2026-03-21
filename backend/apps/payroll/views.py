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
        return qs.filter(employee__organization_id=tenant_id) if tenant_id else qs
