"""
Konggest — Time Tracking Views
Version complète sprint AT (2026-04-11)

Corrections et ajouts :
  AT3  — generate_qr : génère token HMAC-SHA256 (clé = SECRET_KEY+date+tenant_id), TTL 24h
  AT4  — scan : valide token HMAC + expires + anti-replay QRScan, insère TimeEntry
  AT5  — IsSameTenant ajouté sur TimeEntryViewSet
  AT9  — toggle connecté (remplace POST/PATCH manuel côté frontend)
  AT10 — stats/ : taux présence réel, moyenne journalière, heures sup du mois
  AT11 — StandardPagination sur TimeEntryViewSet
  AT12 — @cache_response sur list et stats (TTL 60s)
  AT13 — Broadcast Supabase Realtime après scan (time_tracking:{tenant_id})
  AT14 — Détection anomalies : endpoint anomalies/ (retards, absences)
  AT15 — Cleanup logs >14j : via endpoint admin dédié (Celery en P2)
"""
import csv
import hashlib
import hmac
import logging
import threading
from datetime import date, datetime, timedelta

from django.conf import settings
from django.db import models as db_models
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.cache import cache_response, invalidate_cache
from core.pagination import StandardPagination
from core.permissions import IsEmployee, IsHRManager, IsManager, IsSameTenant

from .models import OvertimeRequest, QRScan, QRSession, TimeEntry
from .serializers import (
    OvertimeSerializer,
    QRScanSerializer,
    QRSessionSerializer,
    TimeEntrySerializer,
)

logger = logging.getLogger('konggest.time_tracking')


# ─────────────────────────────────────────────────────────
# Helper — Token HMAC-SHA256
# ─────────────────────────────────────────────────────────

def _generate_qr_token(tenant_id: str, date_str: str) -> str:
    """
    Génère un token HMAC-SHA256 déterministe pour un tenant + date.
    Clé = DJANGO SECRET_KEY. Infalsifiable sans la clé serveur.
    """
    secret = settings.SECRET_KEY.encode('utf-8')
    message = f"{tenant_id}:{date_str}".encode('utf-8')
    return hmac.new(secret, message, hashlib.sha256).hexdigest()


def _verify_qr_token(token: str, tenant_id: str, date_str: str) -> bool:
    """Vérifie un token HMAC avec protection timing-safe."""
    expected = _generate_qr_token(tenant_id, date_str)
    return hmac.compare_digest(token, expected)


# ─────────────────────────────────────────────────────────
# Helper — Broadcast Realtime (AT13)
# ─────────────────────────────────────────────────────────

def _broadcast_realtime_async(tenant_id: str, event: str, payload: dict) -> None:
    """
    AT13 : Broadcast Supabase Realtime après scan.
    Non bloquant (thread daemon).
    Channel : time_tracking:{tenant_id}
    """
    def _task():
        import json
        import urllib.request
        supabase_url = getattr(settings, 'SUPABASE_URL', '')
        key = getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', '')
        if not (supabase_url and key):
            return
        body = json.dumps({
            "messages": [{
                "topic": f"time_tracking:{tenant_id}",
                "event": event,
                "payload": payload,
            }]
        }).encode('utf-8')
        req = urllib.request.Request(
            f"{supabase_url}/realtime/v1/api/broadcast",
            data=body,
            headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            method='POST',
        )
        try:
            urllib.request.urlopen(req, timeout=4)
        except Exception as e:
            logger.warning(f"AT13 Realtime broadcast échec ({event}): {e}")

    threading.Thread(target=_task, daemon=True).start()


# ─────────────────────────────────────────────────────────
# ViewSet principal — Pointage
# AT5  : IsSameTenant ajouté
# AT11 : StandardPagination
# AT12 : @cache_response sur list et stats
# ─────────────────────────────────────────────────────────

class TimeEntryViewSet(viewsets.ModelViewSet):
    """
    CRUD des pointages + actions QR (generate_qr, scan, toggle, stats, anomalies).
    Scoped par tenant via employee__organization_id.
    """
    serializer_class = TimeEntrySerializer
    # AT5 : IsSameTenant pour bloquer l'accès cross-tenant objet par objet
    permission_classes = [IsEmployee, IsSameTenant]
    # AT11 : Pagination standard
    pagination_class = StandardPagination
    filterset_fields = ['employee', 'date', 'is_remote', 'scanned_via_qr']
    search_fields = ['employee__first_name', 'employee__last_name']
    ordering_fields = ['date', 'check_in', 'created_at']
    ordering = ['-date']

    def get_queryset(self):
        """Pointages filtrés par tenant et rôle."""
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = TimeEntry.objects.select_related('employee', 'employee__department')

        if tenant_id:
            qs = qs.filter(employee__organization_id=tenant_id)

        # Un employé standard ne voit que ses propres entrées
        user = self.request.user
        if hasattr(user, 'profile'):
            role = getattr(user.profile, 'role', None)
            if role == 'employee':
                try:
                    qs = qs.filter(employee=user.profile.employee)
                except AttributeError:
                    return TimeEntry.objects.none()

        return qs

    # ── AT12 : Cache Redis 60s sur list ──
    @cache_response(timeout=60, key_prefix='timentry_list')
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        employee = self._get_employee_from_request(self.request)
        entry = serializer.save(employee=employee) if employee else serializer.save()
        tenant_id = getattr(self.request, 'tenant_id', None)
        if tenant_id:
            invalidate_cache(tenant_id, 'timentry_list')
            invalidate_cache(tenant_id, 'timentry_stats')

    def perform_update(self, serializer):
        entry = serializer.save()
        tenant_id = getattr(self.request, 'tenant_id', None)
        if tenant_id:
            invalidate_cache(tenant_id, 'timentry_list')
            invalidate_cache(tenant_id, 'timentry_stats')

    # ── Action : Pointage du jour ──
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Pointage du jour pour l'employé connecté."""
        employee = self._get_employee_from_request(request)
        if not employee:
            return Response({'error': 'Profil employé non trouvé'}, status=400)

        entry = TimeEntry.objects.filter(employee=employee, date=date.today()).first()
        if not entry:
            return Response({'checked_in': False, 'message': "Pas encore pointé aujourd'hui"})

        data = TimeEntrySerializer(entry, context={'request': request}).data
        data['checked_in'] = True
        data['checked_out'] = bool(entry.check_out)
        return Response(data)

    # ── AT9 : toggle — action unifiée (remplace POST+PATCH manuel frontend) ──
    @action(detail=False, methods=['post'])
    def toggle(self, request):
        """
        AT9 — Bascule entrée/sortie pour le jour en cours.
        Remplace le pattern POST /entries/ + PATCH /entries/{id}/ du frontend.
        Retourne un état unifié que le frontend peut afficher directement.
        """
        employee = self._get_employee_from_request(request)
        if not employee:
            return Response({'error': 'Profil employé non trouvé'}, status=400)

        today = date.today()
        now = timezone.now().time()
        tenant_id = getattr(request, 'tenant_id', None)

        try:
            entry = TimeEntry.objects.get(employee=employee, date=today)
            if entry.check_out:
                return Response({
                    'status': 'already_done',
                    'message': 'Journée déjà terminée.',
                    'check_in': str(entry.check_in),
                    'check_out': str(entry.check_out),
                    'worked_hours': entry.worked_hours,
                }, status=status.HTTP_400_BAD_REQUEST)

            # Clock out
            entry.check_out = now
            entry.save()
            if tenant_id:
                invalidate_cache(tenant_id, 'timentry_list')
                invalidate_cache(tenant_id, 'timentry_stats')
            _broadcast_realtime_async(
                str(tenant_id), 'attendance.checkout',
                {'employee_id': employee.id, 'full_name': employee.full_name, 'check_out': str(now)}
            )
            return Response({
                'status': 'checked_out',
                'message': 'Départ enregistré avec succès.',
                'check_in': str(entry.check_in),
                'check_out': str(entry.check_out),
                'worked_hours': entry.worked_hours,
                'entry_id': entry.id,
            })

        except TimeEntry.DoesNotExist:
            # Clock in
            entry = TimeEntry.objects.create(
                employee=employee,
                date=today,
                check_in=now,
                break_minutes=60,
            )
            if tenant_id:
                invalidate_cache(tenant_id, 'timentry_list')
                invalidate_cache(tenant_id, 'timentry_stats')
            _broadcast_realtime_async(
                str(tenant_id), 'attendance.checkin',
                {'employee_id': employee.id, 'full_name': employee.full_name, 'check_in': str(now)}
            )
            return Response({
                'status': 'checked_in',
                'message': 'Arrivée enregistrée avec succès.',
                'check_in': str(entry.check_in),
                'entry_id': entry.id,
            }, status=status.HTTP_201_CREATED)

    # ── AT3 : Génération QR quotidien ──
    @action(detail=False, methods=['post'], permission_classes=[IsManager])
    def generate_qr(self, request):
        """
        AT3 — Génère (ou récupère) le QR Code du jour pour le tenant.
        Token HMAC-SHA256 signé : SECRET_KEY + tenant_id + date.
        TTL 24h. 1 QR par organisation par jour.
        Accessible uniquement aux managers/admin/RH.
        """
        tenant_id = getattr(request, 'tenant_id', None)
        if not tenant_id:
            return Response({'error': 'Organisation non identifiée.'}, status=400)

        # AT3 — Ajusté pour supporter le long-terme (60 jours)
        is_long_term = request.data.get('long_term', False)
        
        if is_long_term:
            expires_at = timezone.now() + timedelta(days=60)
            # Pour le long terme, on utilise une "date virtuelle" ou on ignore la date dans la clé de session
            # afin que le QR reste identique pendant les 60 jours.
            target_date = date(2099, 12, 31) # Date sentinelle pour QR de station
        else:
            expires_at = timezone.now().replace(hour=23, minute=59, second=59, microsecond=0)
            target_date = today

        # Token HMAC déterministe
        token = _generate_qr_token(str(tenant_id), str(target_date))

        # Créer ou récupérer la session
        qr_session, created = QRSession.objects.get_or_create(
            organization_id=tenant_id,
            date=target_date,
            defaults={
                'token': token,
                'expires_at': expires_at,
                'is_active': True,
            }
        )

        if not created and qr_session.is_expired():
            # Réactiver si expiré par erreur de logique
            qr_session.is_active = True
            qr_session.expires_at = expires_at
            qr_session.save(update_fields=['is_active', 'expires_at'])

        serializer = QRSessionSerializer(qr_session)
        return Response({
            **serializer.data,
            'qr_payload': token,   # Ce token est encodé dans le QR Code
            'scan_url': f"/scan?token={token}",
            'created_now': created,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    # ── AT4 : Scan QR → pointage ──
    @action(detail=False, methods=['post'], permission_classes=[IsEmployee])
    def scan(self, request):
        """
        AT4 — Valide un token QR et enregistre le pointage IN ou OUT.

        Sécurité :
          1. Vérification HMAC (authentification du token)
          2. Vérification expiration (expires_at)
          3. Vérification is_active (QR révocable par admin)
          4. Anti-replay par QRScan (1 IN + 1 OUT max par employé par session)

        Request body :
          { "token": "<hmac_hex>", "scan_type": "in" | "out" }
        """
        token = request.data.get('token', '').strip()
        scan_type = request.data.get('scan_type', 'in').strip().lower()

        if not token:
            return Response({'error': 'Token QR manquant.'}, status=400)

        if scan_type not in ('in', 'out'):
            return Response({'error': 'scan_type doit être "in" ou "out".'}, status=400)

        tenant_id = getattr(request, 'tenant_id', None)
        if not tenant_id:
            return Response({'error': 'Organisation non identifiée.'}, status=400)

        today = date.today()

        # 1. Vérification HMAC côté serveur (infalsifiable)
        # On vérifie contre la date du jour OU la date sentinelle (2099-12-31) pour le long-terme
        is_valid = _verify_qr_token(token, str(tenant_id), str(today))
        if not is_valid:
            sentinel_date = date(2099, 12, 31)
            is_valid = _verify_qr_token(token, str(tenant_id), str(sentinel_date))

        if not is_valid:
            logger.warning(f"AT4: Token QR invalide pour tenant {tenant_id}")
            return Response({'error': 'QR Code invalide ou expiré.'}, status=status.HTTP_403_FORBIDDEN)

        # 2. Récupérer la session QR
        try:
            qr_session = QRSession.objects.get(
                organization_id=tenant_id,
                date=today,
                token=token,
                is_active=True,
            )
        except QRSession.DoesNotExist:
            return Response({'error': 'Session QR non trouvée ou désactivée.'}, status=status.HTTP_404_NOT_FOUND)

        # 3. Vérifier expiration
        if qr_session.is_expired():
            return Response({'error': 'Ce QR Code a expiré. Générez-en un nouveau.'}, status=status.HTTP_410_GONE)

        # 4. Récupérer l'employé
        employee = self._get_employee_from_request(request)
        if not employee:
            return Response({'error': 'Profil employé introuvable.'}, status=400)

        # 5. Anti-replay : vérifier si ce scan type existe déjà pour cet employé + session
        if QRScan.objects.filter(
            qr_session=qr_session, employee=employee, scan_type=scan_type
        ).exists():
            msg = 'Vous avez déjà pointé votre entrée.' if scan_type == 'in' else 'Vous avez déjà pointé votre sortie.'
            return Response({'error': msg}, status=status.HTTP_409_CONFLICT)

        now_time = timezone.now().time()
        invalidate_tenant_cache = lambda: [
            invalidate_cache(str(tenant_id), 'timentry_list'),
            invalidate_cache(str(tenant_id), 'timentry_stats'),
        ]

        if scan_type == 'in':
            # Entrée : créer TimeEntry si inexistant
            if TimeEntry.objects.filter(employee=employee, date=today).exists():
                return Response({'error': "Vous êtes déjà pointé pour aujourd'hui."}, status=400)

            entry = TimeEntry.objects.create(
                employee=employee,
                date=today,
                check_in=now_time,
                break_minutes=60,
                scanned_via_qr=True,
            )
            QRScan.objects.create(
                qr_session=qr_session, employee=employee, scan_type='in'
            )
            invalidate_tenant_cache()
            _broadcast_realtime_async(
                str(tenant_id), 'attendance.scan_in',
                {'employee_id': employee.id, 'full_name': employee.full_name,
                 'check_in': str(now_time), 'via_qr': True}
            )
            return Response({
                'status': 'checked_in',
                'message': f'Entrée enregistrée à {now_time.strftime("%H:%M")} via QR Code.',
                'check_in': str(entry.check_in),
                'entry_id': entry.id,
                'employee': employee.full_name,
            }, status=status.HTTP_201_CREATED)

        else:  # scan_type == 'out'
            try:
                entry = TimeEntry.objects.get(employee=employee, date=today)
            except TimeEntry.DoesNotExist:
                return Response({'error': "Vous n'avez pas encore pointé votre entrée."}, status=400)

            if entry.check_out:
                return Response({'error': "Sortie déjà enregistrée pour aujourd'hui."}, status=400)

            entry.check_out = now_time
            entry.scanned_via_qr = True
            entry.save(update_fields=['check_out', 'scanned_via_qr'])
            QRScan.objects.create(
                qr_session=qr_session, employee=employee, scan_type='out'
            )
            invalidate_tenant_cache()
            _broadcast_realtime_async(
                str(tenant_id), 'attendance.scan_out',
                {'employee_id': employee.id, 'full_name': employee.full_name,
                 'check_out': str(now_time), 'worked_hours': entry.worked_hours, 'via_qr': True}
            )
            return Response({
                'status': 'checked_out',
                'message': f'Sortie enregistrée à {now_time.strftime("%H:%M")} via QR Code.',
                'check_in': str(entry.check_in),
                'check_out': str(entry.check_out),
                'worked_hours': entry.worked_hours,
                'entry_id': entry.id,
                'employee': employee.full_name,
            })

    # ── AT10 : Statistiques réelles ──
    @action(detail=False, methods=['get'])
    @cache_response(timeout=60, key_prefix='timentry_stats')
    def stats(self, request):
        """
        AT10 — Statistiques de présence et pointage (données réelles, non mockées).
        - Taux de présence du jour
        - Moyenne journalière des heures travaillées (30 derniers jours)
        - Heures sup du mois en cours
        - Employés actuellement présents
        """
        tenant_id = getattr(request, 'tenant_id', None)
        today = date.today()
        month_start = today.replace(day=1)

        # Total employés actifs
        from apps.employees.models import Employee as Emp
        total_active = Emp.objects.filter(
            organization_id=tenant_id, status='active'
        ).count() if tenant_id else 0

        # Présents aujourd'hui
        present_today = TimeEntry.objects.filter(
            employee__organization_id=tenant_id,
            date=today,
        ).count() if tenant_id else 0

        # Taux de présence
        presence_rate = round((present_today / total_active * 100), 1) if total_active > 0 else 0

        # Actuellement pointés (entrée sans sortie = "en cours")
        currently_in = TimeEntry.objects.filter(
            employee__organization_id=tenant_id,
            date=today,
            check_out__isnull=True,
        ).count() if tenant_id else 0

        # Moyenne journalière heures travaillées (30 derniers jours)
        thirty_days_ago = today - timedelta(days=30)
        entries_30d = TimeEntry.objects.filter(
            employee__organization_id=tenant_id,
            date__gte=thirty_days_ago,
            check_out__isnull=False,  # Seulement les journées complètes
        ).values_list('check_in', 'check_out', 'break_minutes', 'date')

        total_hours = 0
        counted = 0
        for ci, co, brk, d in entries_30d:
            if ci and co:
                dt_ci = datetime.combine(d, ci)
                dt_co = datetime.combine(d, co)
                h = max((dt_co - dt_ci).total_seconds() / 3600 - brk / 60, 0)
                total_hours += h
                counted += 1

        avg_daily_hours = round(total_hours / counted, 2) if counted > 0 else 0

        # Heures supplémentaires du mois (heures > 8h/jour)
        overtime_hours = max(round(total_hours - (counted * 8), 1), 0) if counted > 0 else 0

        # Scans QR ce mois
        qr_scans_month = TimeEntry.objects.filter(
            employee__organization_id=tenant_id,
            date__gte=month_start,
            scanned_via_qr=True,
        ).count() if tenant_id else 0

        # Top absences (employés actifs sans pointage cette semaine)
        week_start = today - timedelta(days=today.weekday())
        employees_this_week = TimeEntry.objects.filter(
            employee__organization_id=tenant_id,
            date__gte=week_start,
        ).values_list('employee_id', flat=True).distinct()

        absences_this_week = Emp.objects.filter(
            organization_id=tenant_id, status='active'
        ).exclude(id__in=employees_this_week).count() if tenant_id else 0

        return Response({
            'today': {
                'date': str(today),
                'total_active_employees': total_active,
                'present': present_today,
                'currently_in': currently_in,
                'presence_rate': f"{presence_rate}%",
                'absent': total_active - present_today,
            },
            'month': {
                'avg_daily_hours': f"{avg_daily_hours}h",
                'total_overtime_hours': f"{overtime_hours}h",
                'qr_scans': qr_scans_month,
            },
            'week': {
                'absences': absences_this_week,
            },
        })

    # ── AT14 : Détection anomalies ──
    @action(detail=False, methods=['get'], permission_classes=[IsManager])
    def anomalies(self, request):
        """
        AT14 — Détecte retards et absences pour le jour en cours.
        Seuil retard : check_in > 09:00 (configurable via hr_settings)
        Absence : employé actif sans TimeEntry pour aujourd'hui.
        """
        tenant_id = getattr(request, 'tenant_id', None)
        if not tenant_id:
            return Response({'error': 'Organisation non identifiée.'}, status=400)

        today = date.today()
        from apps.employees.models import Employee as Emp
        from core.hr_settings import WORK_START_HOUR

        work_start = datetime.strptime(f"{WORK_START_HOUR}:00", "%H:%M").time()

        # Retards : check_in > work_start
        late_entries = TimeEntry.objects.filter(
            employee__organization_id=tenant_id,
            date=today,
        ).exclude(check_in__lte=work_start).select_related('employee')

        late_list = [
            {
                'employee_id': e.employee.id,
                'full_name': e.employee.full_name,
                'check_in': str(e.check_in),
                'delay_minutes': int(
                    (datetime.combine(today, e.check_in) -
                     datetime.combine(today, work_start)).total_seconds() / 60
                ),
            }
            for e in late_entries
        ]

        # Absences : employés actifs sans pointage aujourd'hui
        present_ids = TimeEntry.objects.filter(
            employee__organization_id=tenant_id,
            date=today,
        ).values_list('employee_id', flat=True)

        absent_employees = Emp.objects.filter(
            organization_id=tenant_id,
            status='active',
        ).exclude(id__in=present_ids).values('id', 'first_name', 'last_name', 'department__name')

        return Response({
            'date': str(today),
            'work_start': str(work_start),
            'late': late_list,
            'late_count': len(late_list),
            'absent': list(absent_employees),
            'absent_count': absent_employees.count(),
        })

    # ─── Helper interne ──────────────────────────────────

    def _get_employee_from_request(self, request):
        """Récupère l'employé lié au user connecté. Logge si absent."""
        if hasattr(request.user, 'profile'):
            try:
                return request.user.profile.employee
            except AttributeError:
                logger.info(f"Aucun profil employé lié au user {request.user.id}")
        return None


# ─────────────────────────────────────────────────────────
# ViewSet Heures Supplémentaires
# ─────────────────────────────────────────────────────────

class OvertimeViewSet(viewsets.ModelViewSet):
    serializer_class = OvertimeSerializer
    permission_classes = [IsEmployee, IsSameTenant]
    pagination_class = StandardPagination
    filterset_fields = ['employee', 'status']

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = OvertimeRequest.objects.select_related('employee')

        if tenant_id:
            qs = qs.filter(employee__organization_id=tenant_id)

        user = self.request.user
        if hasattr(user, 'profile'):
            role = getattr(user.profile, 'role', None)
            if role == 'employee':
                try:
                    qs = qs.filter(employee=user.profile.employee)
                except AttributeError:
                    return OvertimeRequest.objects.none()

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if hasattr(user, 'profile'):
            try:
                serializer.save(employee=user.profile.employee, status='pending')
                return
            except AttributeError:
                pass
        serializer.save(status='pending')

    @action(detail=True, methods=['post'], permission_classes=[IsManager])
    def approve(self, request, pk=None):
        overtime = self.get_object()
        overtime.status = 'approved'
        overtime.save()
        return Response({'message': 'Demande approuvée', 'status': 'approved'})

    @action(detail=True, methods=['post'], permission_classes=[IsManager])
    def reject(self, request, pk=None):
        overtime = self.get_object()
        overtime.status = 'rejected'
        overtime.save()
        return Response({'message': 'Demande refusée', 'status': 'rejected'})


# ─────────────────────────────────────────────────────────
# ViewSet Sessions QR (lecture seule pour managers)
# ─────────────────────────────────────────────────────────

class QRSessionViewSet(viewsets.ReadOnlyModelViewSet):
    """Historique des sessions QR — lecture seule pour RH/Admin."""
    serializer_class = QRSessionSerializer
    permission_classes = [IsManager]
    filterset_fields = ['date', 'is_active']
    ordering = ['-date']

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = QRSession.objects.all()
        if tenant_id:
            qs = qs.filter(organization_id=tenant_id)
        return qs.order_by('-date')
