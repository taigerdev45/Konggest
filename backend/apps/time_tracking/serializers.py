"""Konggest — Time Tracking Serializers"""
from rest_framework import serializers
from .models import TimeEntry, OvertimeRequest


class TimeEntrySerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    worked_hours = serializers.FloatField(read_only=True)
    
    class Meta:
        model = TimeEntry
        fields = ['id', 'employee', 'employee_name', 'date', 'check_in', 'check_out',
                  'break_minutes', 'worked_hours', 'notes', 'is_remote', 'created_at']
        read_only_fields = ['created_at']


class OvertimeSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    
    class Meta:
        model = OvertimeRequest
        fields = ['id', 'employee', 'employee_name', 'date', 'hours', 'reason', 'status', 'created_at']
        read_only_fields = ['created_at', 'status']
