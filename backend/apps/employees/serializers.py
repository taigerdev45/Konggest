"""Konggest — Employees Serializers"""
from rest_framework import serializers
from .models import Employee, Department, Position


class DepartmentSerializer(serializers.ModelSerializer):
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'description', 'manager', 'parent', 'is_active', 'employee_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_employee_count(self, obj):
        return obj.employees.filter(status='active').count()


class PositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Position
        fields = ['id', 'title', 'description', 'department', 'is_active']


class EmployeeListSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True, default='')
    position_title = serializers.CharField(source='position.title', read_only=True, default='')

    class Meta:
        model = Employee
        fields = ['id', 'employee_id', 'cnss_number', 'first_name', 'last_name', 'email', 'phone',
                  'department', 'department_name', 'position', 'position_title', 'site_location',
                  'contract_type', 'is_expat', 'status', 'hire_date', 'photo']


class EmployeeDetailSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True, default='')
    position_title = serializers.CharField(source='position.title', read_only=True, default='')
    manager_name = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = '__all__'
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']

    def get_manager_name(self, obj):
        return obj.manager.full_name if obj.manager else None
