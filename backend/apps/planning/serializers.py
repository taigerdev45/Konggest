from rest_framework import serializers
from .models import ShiftTemplate, Schedule
from apps.employees.serializers import EmployeeListSerializer

class ShiftTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShiftTemplate
        fields = '__all__'
        read_only_fields = ['organization', 'created_at']

class ScheduleSerializer(serializers.ModelSerializer):
    employee_details = EmployeeListSerializer(source='employee', read_only=True)
    
    class Meta:
        model = Schedule
        fields = '__all__'
        read_only_fields = ['organization', 'created_at', 'updated_at']

class BulkScheduleSerializer(serializers.Serializer):
    employee_ids = serializers.ListField(
        child=serializers.IntegerField()
    )
    date = serializers.DateField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    status = serializers.ChoiceField(choices=Schedule.STATUS_CHOICES, required=False, default='draft')
