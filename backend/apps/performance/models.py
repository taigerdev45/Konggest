"""Konggest — Performance Models & Views"""
from django.db import models
from rest_framework import viewsets, serializers
from apps.employees.models import Employee
from core.permissions import IsManager


class PerformanceReview(models.Model):
    STATUS_CHOICES = [('draft', 'Brouillon'), ('in_progress', 'En cours'), ('completed', 'Terminé')]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='reviews')
    reviewer = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, related_name='given_reviews')
    period = models.CharField(max_length=50, verbose_name="Période")
    overall_rating = models.IntegerField(default=0, verbose_name="Note globale (1-5)")
    strengths = models.TextField(blank=True, verbose_name="Points forts")
    improvements = models.TextField(blank=True, verbose_name="Axes d'amélioration")
    comments = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    review_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Évaluation"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.employee.full_name} - {self.period}"


class Objective(models.Model):
    STATUS_CHOICES = [
        ('not_started', 'Non démarré'), ('in_progress', 'En cours'),
        ('completed', 'Atteint'), ('not_achieved', 'Non atteint'),
    ]
    review = models.ForeignKey(PerformanceReview, on_delete=models.CASCADE, related_name='objectives', null=True, blank=True)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='objectives')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    progress = models.IntegerField(default=0, verbose_name="Progression (%)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Objectif"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.employee.full_name}: {self.title}"


# ─── Serializers ───
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


# ─── Views ───
class PerformanceReviewViewSet(viewsets.ModelViewSet):
    serializer_class = PerformanceReviewSerializer
    permission_classes = [IsManager]
    filterset_fields = ['employee', 'status']
    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = PerformanceReview.objects.select_related('employee', 'reviewer').prefetch_related('objectives')
        return qs.filter(employee__organization_id=tenant_id) if tenant_id else qs

class ObjectiveViewSet(viewsets.ModelViewSet):
    serializer_class = ObjectiveSerializer
    permission_classes = [IsManager]
    filterset_fields = ['employee', 'status']
    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = Objective.objects.select_related('employee')
        return qs.filter(employee__organization_id=tenant_id) if tenant_id else qs
