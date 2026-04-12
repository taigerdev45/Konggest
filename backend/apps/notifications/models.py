""" Konggest — Notifications Models """
from django.db import models
from django.contrib.auth.models import User


class Notification(models.Model):
    """
    Model representing a notification sent to a user.
    Includes type for styling, link for redirection and status for read tracking.
    """
    TYPE_CHOICES = [
        ('info', 'Information'),
        ('warning', 'Avertissement'),
        ('success', 'Succès'),
        ('leave', 'Congé'),
        ('payroll', 'Paie'),
        ('task', 'Tâche'),
    ]
    
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='notifications',
        db_index=True  # Important for filtering by user
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=20, 
        choices=TYPE_CHOICES, 
        default='info'
    )
    link = models.CharField(max_length=500, blank=True)
    is_read = models.BooleanField(default=False, db_index=True)  # Index for unread counts
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Notification"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),  # Compound index for unread count optimization
            models.Index(fields=['-created_at']),       # Index for latest notifications
        ]

    def __str__(self):
        return f"{self.title} → {self.user.username}"
