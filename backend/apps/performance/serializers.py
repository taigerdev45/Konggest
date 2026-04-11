from rest_framework import serializers
from .models import Objective, PerformanceReview

class ObjectiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Objective
        fields = ['id', 'review', 'employee', 'title', 'description', 'due_date',
                  'progress', 'status', 'created_at']

class PerformanceReviewSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    reviewer_name = serializers.SerializerMethodField()
    objectives = ObjectiveSerializer(many=True, read_only=True)
    
    class Meta:
        model = PerformanceReview
        fields = ['id', 'employee', 'employee_name', 'reviewer', 'reviewer_name', 'period',
                  'overall_rating', 'strengths', 'improvements', 'comments', 'status',
                  'review_date', 'objectives', 'created_at']
                  
    def get_reviewer_name(self, obj):
        return obj.reviewer.full_name if obj.reviewer else None
