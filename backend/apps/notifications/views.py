"""Konggest — Notifications Views"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing user notifications.
    Optimized with custom actions for read/unread management.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='mark-all-read', url_name='mark-all-read')
    def mark_all_read(self, request):
        """
        Mark all unread notifications for the current user as read.
        Bulk update for performance.
        """
        updated_count = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({
            'status': 'success',
            'message': f'{updated_count} notifications marked as read'
        })

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """
        Mark a specific notification as read.
        """
        try:
            notification = self.get_object()
            if not notification.is_read:
                notification.is_read = True
                notification.save(update_fields=['is_read'])
            return Response({'status': 'success', 'message': 'Notification marked as read'})
        except Exception as e:
            return Response(
                {'status': 'error', 'message': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'], url_path='unread-count', url_name='unread-count')
    def unread_count(self, request):
        """
        Return the count of unread notifications for the current user.
        Quickly accessible for a badge in the UI.
        """
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})
