"""
Konggest — Payroll Views (Refactorisé)

CORRECTIONS APPLIQUÉES :
- [P0] Bug return qs manquant dans PayslipViewSet.get_queryset → corrigé
- [P1] Serializers extraits dans serializers.py (MVC)
- [P1] generate_for_period → délégué à Celery (generate_payslips_async)
- [P2] N+1 payslip_count → annotate(payslip_count=Count('payslips'))
- [P2] @cache_response(timeout=300) sur les listes
- [P2] StandardPagination ajouté
- [P3] _broadcast_realtime_async sur validate et pay
- [P3] generate_payslip_pdf déclenché lors de la validation
"""
from rest_framework import viewsets, serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Count
from core.permissions import IsHRManager
from core.pagination import StandardPagination
from core.cache import cache_response
from .models import PayrollPeriod, Payslip, PayrollItem
from .serializers import PayrollPeriodSerializer, PayslipSerializer
from .tasks import generate_payslips_async, generate_payslip_pdf
from apps.accounts.utils import log_action
from apps.time_tracking.views import _broadcast_realtime_async
import threading


class PayrollPeriodViewSet(viewsets.ModelViewSet):
    serializer_class = PayrollPeriodSerializer
    permission_classes = [IsHRManager]
    pagination_class = StandardPagination

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None) or getattr(
            self.request.user, 'profile', None) and self.request.user.profile.organization_id
        qs = PayrollPeriod.objects.annotate(
            payslip_count=Count('payslips')  # Fix N+1 : 1 seule requête avec COUNT
        )
        return qs.filter(organization_id=tenant_id) if tenant_id else qs.none()

    @cache_response(timeout=300)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        tenant_id = getattr(self.request, 'tenant_id', None)
        if not tenant_id:
            try:
                tenant_id = self.request.user.profile.organization_id
            except Exception:
                pass
        if not tenant_id:
            raise serializers.ValidationError({"error": "Organisation non identifiée."})
        serializer.save(organization_id=tenant_id)


class PayslipViewSet(viewsets.ModelViewSet):
    serializer_class = PayslipSerializer
    permission_classes = [IsHRManager]
    pagination_class = StandardPagination
    filterset_fields = ['period', 'status', 'employee']

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        if not tenant_id:
            try:
                tenant_id = self.request.user.profile.organization_id
            except Exception:
                return Payslip.objects.none()

        qs = Payslip.objects.select_related('employee', 'period').prefetch_related('items')
        qs = qs.filter(employee__organization_id=tenant_id)

        # Les employés ne voient que leurs propres fiches
        if hasattr(self.request.user, 'profile') and self.request.user.profile.role == 'employee':
            qs = qs.filter(employee__user=self.request.user)

        return qs  # ← BUG P0 CORRIGÉ : return manquant en production

    @cache_response(timeout=300)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['post'])
    def generate_for_period(self, request):
        """
        Délègue la génération massive au Celery Worker.
        Retourne immédiatement (HTTP 202 Accepted) sans bloquer le Web Worker Render.
        """
        period_id = request.data.get('period_id')
        if not period_id:
            return Response({'error': 'period_id is required'}, status=400)

        tenant_id = getattr(request, 'tenant_id', None) or request.user.profile.organization_id

        # Vérification rapide que la période existe et appartient au tenant
        if not PayrollPeriod.objects.filter(id=period_id, organization_id=tenant_id).exists():
            return Response({'error': 'Période introuvable ou accès interdit.'}, status=404)

        # Délégation asynchrone → Celery Worker
        generate_payslips_async.delay(period_id, str(tenant_id), request.user.id)

        return Response({
            'status': 'accepted',
            'message': 'La génération des fiches de paie est en cours en arrière-plan. Actualisez dans quelques instants.',
            'period_id': period_id,
        }, status=202)

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        payslip = self.get_object()
        payslip.status = 'validated'
        payslip.save(update_fields=['status'])
        log_action(request.user, request.user.profile.organization, 'update', 'payslip', payslip.id, {'status': 'validated'})

        # Génération PDF asynchrone dès la validation
        generate_payslip_pdf.delay(payslip.id)

        # Broadcast Realtime → notifie le collaborateur que sa fiche est prête
        self._broadcast(payslip, 'validated')

        return Response({'status': 'validated'})

    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        payslip = self.get_object()
        payslip.status = 'paid'
        payslip.save(update_fields=['status'])
        log_action(request.user, request.user.profile.organization, 'update', 'payslip', payslip.id, {'status': 'paid'})

        # Broadcast Realtime → notifie le collaborateur du paiement
        self._broadcast(payslip, 'paid')

        return Response({'status': 'paid'})

    def _broadcast(self, payslip, event_type):
        """Diffuse l'événement aux clients Supabase Realtime abonnés au channel payroll."""
        tenant_id = payslip.employee.organization_id
        payload = {
            'id': payslip.id,
            'employee_name': payslip.employee.full_name,
            'period': payslip.period.name,
            'net_salary': str(payslip.net_salary),
            'status': payslip.status,
            'action': event_type,
        }
        try:
            threading.Thread(
                target=_broadcast_realtime_async,
                args=(f"payroll:{tenant_id}", "payslip.status_changed", payload)
            ).start()
        except Exception:
            pass
