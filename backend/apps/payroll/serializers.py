"""Konggest — Payroll Serializers (MVC extraction from views.py)"""
from rest_framework import serializers
from django.db.models import Count
from .models import PayrollPeriod, Payslip, PayrollItem


class PayrollItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollItem
        fields = ['id', 'name', 'item_type', 'amount', 'is_percentage']


class PayrollPeriodSerializer(serializers.ModelSerializer):
    # Fix N+1 : utiliser l'annotation injectée par le ViewSet plutôt qu'un count() isolé
    payslip_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = PayrollPeriod
        fields = ['id', 'name', 'start_date', 'end_date', 'is_closed', 'payslip_count', 'created_at']


class PayslipSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    period_name = serializers.CharField(source='period.name', read_only=True)
    items = PayrollItemSerializer(many=True, read_only=True)

    class Meta:
        model = Payslip
        fields = [
            'id', 'employee', 'employee_name', 'period', 'period_name',
            'gross_salary', 'total_deductions', 'total_bonuses', 'net_salary',
            'status', 'notes', 'items', 'created_at',
        ]
