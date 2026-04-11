from rest_framework import serializers
from .models import Expense, ExpenseCategory
from apps.employees.models import Employee

class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = ['id', 'name', 'description', 'is_active']
        read_only_fields = ['id', 'organization']

class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            'id', 'employee', 'employee_name', 'category', 'category_name',
            'amount', 'date', 'reason', 'status', 'attachment_url',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'employee', 'organization', 'status', 'attachment_url', 'created_at', 'updated_at']

    def get_employee_name(self, obj):
        return obj.employee.user.get_full_name()

    def create(self, validated_data):
        user = self.context['request'].user
        employee = Employee.objects.filter(user=user).first()
        if not employee:
            raise serializers.ValidationError({"error": "Vous n'êtes pas reconnu comme employé."})
            
        validated_data['employee'] = employee
        validated_data['organization'] = employee.organization
        return super().create(validated_data)
