from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from core.pagination import StandardPagination
from core.permissions import IsManager
from core.cache import cache_response
from .models import PerformanceReview, Objective
from .serializers import PerformanceReviewSerializer, ObjectiveSerializer
from .tasks import send_performance_feedback
from apps.time_tracking.views import _broadcast_realtime_async
import threading

class PerformanceReviewViewSet(viewsets.ModelViewSet):
    serializer_class = PerformanceReviewSerializer
    permission_classes = [IsManager] # Ou une permission custom selon le RBAC
    pagination_class = StandardPagination
    filterset_fields = ['employee', 'status', 'period']
    search_fields = ['employee__first_name', 'employee__last_name', 'period']

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        if not tenant_id:
            try: tenant_id = self.request.user.profile.organization_id
            except: return PerformanceReview.objects.none()
            
        qs = PerformanceReview.objects.select_related('employee', 'reviewer').prefetch_related('objectives')
        return qs.filter(employee__organization_id=tenant_id).order_by('-created_at')

    @cache_response(timeout=120)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        review = serializer.save()
        tenant_id = review.employee.organization_id
        
        # Temps-réel: notifier l'équipe RH / frontend
        self._broadcast(tenant_id, review, 'created')
        
    def perform_update(self, serializer):
        old_status = serializer.instance.status
        review = serializer.save()
        tenant_id = review.employee.organization_id
        
        self._broadcast(tenant_id, review, 'updated')
        
        # Tâche Celery : Envoi du mail de feedback si l'évaluation passe en statut "Terminé"
        if old_status != 'completed' and review.status == 'completed':
            sender_name = review.reviewer.full_name if review.reviewer else "L'équipe Konggest"
            send_performance_feedback.delay(review.id, sender_name)

    def perform_destroy(self, instance):
        tenant_id = instance.employee.organization_id
        self._broadcast(tenant_id, instance, 'deleted')
        instance.delete()

    def _broadcast(self, tenant_id, review, action_type):
        payload = {
            "id": review.id,
            "period": review.period,
            "employeeName": review.employee.full_name,
            "status": review.status,
            "action": action_type
        }
        try:
            threading.Thread(
                target=_broadcast_realtime_async,
                args=(f"performance:{tenant_id}", "review.changed", payload)
            ).start()
        except:
            pass


class ObjectiveViewSet(viewsets.ModelViewSet):
    serializer_class = ObjectiveSerializer
    permission_classes = [IsManager]
    pagination_class = StandardPagination
    filterset_fields = ['employee', 'status', 'review']
    search_fields = ['title']

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        if not tenant_id:
            try: tenant_id = self.request.user.profile.organization_id
            except: return Objective.objects.none()
            
        qs = Objective.objects.select_related('employee')
        return qs.filter(employee__organization_id=tenant_id).order_by('-created_at')

    @cache_response(timeout=120)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
        
    def perform_create(self, serializer):
        obj = serializer.save()
        self._broadcast_obj(obj.employee.organization_id, obj, 'created')

    def perform_update(self, serializer):
        obj = serializer.save()
        self._broadcast_obj(obj.employee.organization_id, obj, 'updated')

    def perform_destroy(self, instance):
        tenant_id = instance.employee.organization_id
        self._broadcast_obj(tenant_id, instance, 'deleted')
        instance.delete()

    def _broadcast_obj(self, tenant_id, obj, action_type):
        payload = {
            "id": obj.id,
            "title": obj.title,
            "status": obj.status,
            "action": action_type
        }
        try:
            threading.Thread(
                target=_broadcast_realtime_async,
                args=(f"performance:{tenant_id}", "objective.changed", payload)
            ).start()
        except:
            pass
