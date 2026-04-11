"""Konggest — Recruitment Serializers"""
from rest_framework import serializers
from .models import JobPosting, Application, Interview

class JobPostingSerializer(serializers.ModelSerializer):
    application_count = serializers.IntegerField(read_only=True, default=0)
    
    class Meta:
        model = JobPosting
        fields = ['id', 'title', 'department', 'location', 'contract_type', 'description',
                  'requirements', 'salary_range', 'status', 'published_at', 'closes_at',
                  'application_count', 'created_at']

class PublicJobSerializer(serializers.ModelSerializer):
    """Public serializer - excludes sensitive fields."""
    class Meta:
        model = JobPosting
        fields = ['id', 'title', 'department', 'location', 'contract_type', 
                  'description', 'requirements', 'salary_range', 'published_at', 'closes_at']

class ApplicationSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source='job.title', read_only=True)
    class Meta:
        model = Application
        fields = ['id', 'job', 'job_title', 'first_name', 'last_name', 'email', 'phone',
                  'resume_url', 'cover_letter', 'stage', 'notes', 'rating', 'created_at']

class InterviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interview
        fields = ['id', 'application', 'scheduled_at', 'interviewer', 'location', 'notes', 'outcome']
