"""Konggest — Notifications Serializers"""
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for the Notification model.
    Optimized to return human-readable dates.
    """
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'notification_type', 
            'link', 'is_read', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
