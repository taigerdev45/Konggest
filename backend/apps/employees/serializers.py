"""Konggest — Employees Serializers"""
from rest_framework import serializers
from .models import Employee, Department, Position, Location


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


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ['id', 'name', 'address', 'city', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class EmployeeListSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True, default='')
    position_title = serializers.CharField(source='position.title', read_only=True, default='')

    class Meta:
        model = Employee
        fields = ['id', 'employee_id', 'cnss_number', 'first_name', 'last_name', 'email', 'phone',
                  'department', 'department_name', 'position', 'position_title', 'location', 
                  'site_location', 'contract_type', 'is_expat', 'status', 'hire_date', 'photo']
        extra_kwargs = {
            'site_location': {'required': False, 'allow_null': True, 'allow_blank': True}
        }


class EmployeeDetailSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True, default='')
    position_title = serializers.CharField(source='position.title', read_only=True, default='')
    location_name = serializers.CharField(source='location.name', read_only=True, default='')
    manager_name = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = '__all__'
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']
        extra_kwargs = {
            'site_location': {'required': False, 'allow_null': True, 'allow_blank': True}
        }

    def get_manager_name(self, obj):
        return obj.manager.full_name if obj.manager else None
