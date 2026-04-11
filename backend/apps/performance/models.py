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
        indexes = [
            models.Index(fields=['employee', 'status']),
            models.Index(fields=['reviewer']),
            models.Index(fields=['period']),
        ]

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
        indexes = [
            models.Index(fields=['employee', 'status']),
            models.Index(fields=['review']),
        ]

    def __str__(self):
        return f"{self.employee.full_name}: {self.title}"



