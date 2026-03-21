"""Konggest — Leaves Serializers"""
from rest_framework import serializers
from .models import LeaveType, LeaveRequest, LeaveBalance


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = ['id', 'name', 'code', 'days_per_year', 'is_paid', 'requires_approval', 'color', 'is_active']


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    leave_type_name = serializers.CharField(source='leave_type.name', read_only=True)
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LeaveRequest
        fields = ['id', 'employee', 'employee_name', 'leave_type', 'leave_type_name',
                  'start_date', 'end_date', 'days_count', 'reason', 'status',
                  'approved_by', 'approved_by_name', 'approved_at', 'rejection_reason',
                  'created_at']
        read_only_fields = ['id', 'approved_by', 'approved_at', 'created_at']

    def get_approved_by_name(self, obj):
        return obj.approved_by.full_name if obj.approved_by else None


class LeaveBalanceSerializer(serializers.ModelSerializer):
    leave_type_name = serializers.CharField(source='leave_type.name', read_only=True)
    remaining_days = serializers.DecimalField(max_digits=5, decimal_places=1, read_only=True)

    class Meta:
        model = LeaveBalance
        fields = ['id', 'employee', 'leave_type', 'leave_type_name', 'year',
                  'total_days', 'used_days', 'carried_over', 'remaining_days']
