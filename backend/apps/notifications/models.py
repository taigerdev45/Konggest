"""Konggest — Notifications Models & Views"""
from django.db import models
from django.contrib.auth.models import User
from rest_framework import viewsets, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from core.permissions import IsEmployee


class Notification(models.Model):
    TYPE_CHOICES = [
        ('info', 'Information'), ('warning', 'Avertissement'),
        ('success', 'Succès'), ('leave', 'Congé'),
        ('payroll', 'Paie'), ('task', 'Tâche'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='info')
    link = models.CharField(max_length=500, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Notification"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} → {self.user.get_full_name()}"


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'notification_type', 'link', 'is_read', 'created_at']
        read_only_fields = ['id', 'created_at']


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsEmployee]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'status': 'all marked as read'})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'marked as read'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})
