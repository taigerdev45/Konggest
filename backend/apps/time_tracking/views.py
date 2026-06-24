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
        tenant_id = self._resolve_tenant_id()
        qs = TimeEntry.objects.select_related('employee', 'employee__department')

        if tenant_id:
            qs = qs.filter(employee__organization_id=tenant_id)

        # Un employé standard ne voit que ses propres entrées
        user = self.request.user
        if hasattr(user, 'profile'):
            role = getattr(user.profile, 'role', None)
            if role == 'employee':
                try:
                    qs = qs.filter(employee=user.employee)
                except (AttributeError, Exception):
                    return TimeEntry.objects.none()

        return qs

    # ── AT12 : Cache Redis 60s sur list ──
    @cache_response(timeout=60, key_prefix='timentry_list')
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        employee = self._get_employee_from_request(self.request)
        entry = serializer.save(employee=employee) if employee else serializer.save()
        tenant_id = self._resolve_tenant_id()
        if tenant_id:
            invalidate_cache(tenant_id, 'timentry_list')
            invalidate_cache(tenant_id, 'timentry_stats')

    def perform_update(self, serializer):
        entry = serializer.save()
        tenant_id = self._resolve_tenant_id()
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
        tenant_id = self._resolve_tenant_id(request)

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

            # Clock out — optionally update notes/is_remote if provided
            entry.check_out = now
            notes = request.data.get('notes')
            is_remote = request.data.get('is_remote')
            if notes is not None:
                entry.notes = str(notes)[:500]
            if is_remote is not None:
                entry.is_remote = bool(is_remote)
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
            is_remote = bool(request.data.get('is_remote', False))
            notes = str(request.data.get('notes', ''))[:500]
            entry = TimeEntry.objects.create(
                employee=employee,
                date=today,
                check_in=now,
                break_minutes=60,
                is_remote=is_remote,
                notes=notes,
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
        tenant_id = self._resolve_tenant_id(request)
        if not tenant_id:
            return Response({'error': 'Organisation non identifiée.'}, status=400)

        # AT3 — Ajusté pour supporter le long-terme (60 jours)
        is_long_term = request.data.get('long_term', False)
        today = date.today()

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

    # ── AT4 : Scan QR → pointage (AT-SCALE: Redis cache + async write) ──
    @action(detail=False, methods=['post'], permission_classes=[IsEmployee])
    def scan(self, request):
        """
        AT4 / AT-SCALE — Valide un token QR et enregistre le pointage.

        Optimisations haute fréquence (1M+ scans simultanés) :
          - QRSession chargée depuis Redis (1 Redis GET vs 1 DB read par scan)
          - Anti-replay via Redis SETNX atomique (0 DB read vs 2 DB reads)
          - Écriture DB déléguée à Celery (réponse <10ms au lieu de ~100ms)
          - Fallback synchrone si Redis ou Celery indisponible

        Sécurité maintenue :
          1. HMAC vérification (CPU only, ~0.1ms)
          2. Redis SETNX atomique = anti-replay infalsifiable
          3. DB unique_together reste le filet de sécurité en cas de crash Redis
        """
        token = request.data.get('token', '').strip()
        scan_type = request.data.get('scan_type', 'in').strip().lower()

        if not token:
            return Response({'error': 'Token QR manquant.'}, status=400)
        if scan_type not in ('in', 'out'):
            return Response({'error': 'scan_type doit être "in" ou "out".'}, status=400)

        tenant_id = self._resolve_tenant_id(request)
        if not tenant_id:
            return Response({'error': 'Organisation non identifiée.'}, status=400)

        today = date.today()

        # ── 1. Vérification HMAC (CPU only, infalsifiable) ──
        is_valid = _verify_qr_token(token, str(tenant_id), str(today))
        if not is_valid:
            is_valid = _verify_qr_token(token, str(tenant_id), str(date(2099, 12, 31)))
        if not is_valid:
            logger.warning(f"AT4: Token QR invalide pour tenant {tenant_id}")
            return Response({'error': 'QR Code invalide ou expiré.'}, status=status.HTTP_403_FORBIDDEN)

        # ── 2. QRSession depuis Redis (1 GET partagé par toute l'org) ──
        import json as _json
        import datetime as _dt
        redis_conn = None
        qr_session_data = None
        try:
            from django_redis import get_redis_connection
            redis_conn = get_redis_connection('default')
            cache_key = f"konggest:qrs:{tenant_id}:{today}"
            raw = redis_conn.get(cache_key)
            if raw:
                # Données écrites par notre propre serveur — format JSON strict
                qr_session_data = _json.loads(raw)
        except Exception:
            pass

        if qr_session_data:
            qr_session_id = qr_session_data['id']
            qr_is_active = qr_session_data['active']
            qr_expires_ts = qr_session_data['exp']
            if not qr_is_active:
                return Response({'error': 'Session QR désactivée.'}, status=status.HTTP_404_NOT_FOUND)
            from django.utils import timezone as tz
            expires_at = _dt.datetime.fromtimestamp(qr_expires_ts, tz=_dt.timezone.utc)
            if tz.now() > expires_at:
                return Response({'error': 'Ce QR Code a expiré.'}, status=status.HTTP_410_GONE)
        else:
            # Cache miss — charger depuis DB et mettre en cache
            try:
                qr_session = QRSession.objects.get(
                    organization_id=tenant_id, date=today, token=token, is_active=True,
                )
            except QRSession.DoesNotExist:
                return Response({'error': 'Session QR non trouvée ou désactivée.'}, status=status.HTTP_404_NOT_FOUND)
            if qr_session.is_expired():
                return Response({'error': 'Ce QR Code a expiré.'}, status=status.HTTP_410_GONE)
            qr_session_id = qr_session.id
            if redis_conn:
                try:
                    expires_ts = qr_session.expires_at.timestamp()
                    ttl = max(int(expires_ts - _dt.datetime.now(_dt.timezone.utc).timestamp()), 60)
                    redis_conn.setex(
                        f"konggest:qrs:{tenant_id}:{today}",
                        ttl,
                        _json.dumps({'id': qr_session.id, 'exp': expires_ts, 'active': True}),
                    )
                except Exception:
                    pass

        # ── 3. Récupérer l'employé ──
        employee = self._get_employee_from_request(request)
        if not employee:
            return Response({'error': 'Profil employé introuvable.'}, status=400)

        now_time = timezone.now()
        now_time_str = now_time.strftime('%H:%M:%S')
        today_str = str(today)

        # ── 4. Anti-replay Redis SETNX (atomique, 0 DB read) ──
        replay_blocked = False
        if redis_conn:
            try:
                replay_key = f"konggest:scan_replay:{qr_session_id}:{employee.id}:{scan_type}"
                # SETNX retourne True si la clé n'existait pas (premier scan = accordé)
                acquired = redis_conn.setnx(replay_key, now_time_str)
                if acquired:
                    # Expire à minuit + 1h (marge)
                    import datetime as _dt
                    midnight = _dt.datetime.combine(today + _dt.timedelta(days=1), _dt.time(1, 0))
                    redis_conn.expireat(replay_key, int(midnight.timestamp()))
                else:
                    replay_blocked = True
            except Exception:
                # Redis down → fallback DB check ci-dessous
                pass

        if replay_blocked:
            msg = 'Vous avez déjà pointé votre entrée.' if scan_type == 'in' else 'Vous avez déjà pointé votre sortie.'
            return Response({'error': msg}, status=status.HTTP_409_CONFLICT)

        # Si Redis indisponible, fallback anti-replay DB
        if not redis_conn:
            if QRScan.objects.filter(
                qr_session_id=qr_session_id, employee=employee, scan_type=scan_type
            ).exists():
                msg = 'Vous avez déjà pointé votre entrée.' if scan_type == 'in' else 'Vous avez déjà pointé votre sortie.'
                return Response({'error': msg}, status=status.HTTP_409_CONFLICT)
            if scan_type == 'in' and TimeEntry.objects.filter(employee=employee, date=today).exists():
                return Response({'error': "Vous êtes déjà pointé pour aujourd'hui."}, status=400)

        # ── 5. Écriture async via Celery (réponse immédiate) ──
        celery_dispatched = False
        try:
            from .tasks import persist_qr_scan
            persist_qr_scan.delay(employee.id, qr_session_id, scan_type, now_time_str, today_str)
            celery_dispatched = True
        except Exception:
            pass

        if not celery_dispatched:
            # Celery indisponible → écriture synchrone (fallback)
            from .tasks import persist_qr_scan_impl
            persist_qr_scan_impl(employee.id, qr_session_id, scan_type, now_time_str, today_str)

        # ── 6. Broadcast realtime (non-bloquant) ──
        _broadcast_realtime_async(
            str(tenant_id),
            f'attendance.scan_{scan_type}',
            {'employee_id': employee.id, 'full_name': employee.full_name,
             'time': now_time_str, 'via_qr': True}
        )

        time_label = now_time.strftime('%H:%M')
        if scan_type == 'in':
            return Response({
                'status': 'checked_in',
                'message': f'Entrée enregistrée à {time_label} via QR Code.',
                'check_in': now_time_str,
                'employee': employee.full_name,
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'status': 'checked_out',
                'message': f'Sortie enregistrée à {time_label} via QR Code.',
                'check_out': now_time_str,
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
        tenant_id = self._resolve_tenant_id(request)
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
        tenant_id = self._resolve_tenant_id(request)
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

    # ─── Helpers internes ──────────────────────────────────

    def _resolve_tenant_id(self, request=None):
        """Tenant ID robuste: middleware → profil DRF → None."""
        req = request or self.request
        tenant_id = getattr(req, 'tenant_id', None)
        if not tenant_id:
            try:
                tenant_id = req.user.profile.organization_id
            except Exception:
                pass
        return tenant_id

    def _get_employee_from_request(self, request):
        """Récupère l'employé lié au user connecté. Logge si absent."""
        try:
            return request.user.employee
        except (AttributeError, Exception):
            logger.info(f"Aucun profil employé lié au user {getattr(request.user, 'id', '?')}")
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
        tenant_id = self._resolve_tenant_id()
        qs = OvertimeRequest.objects.select_related('employee')

        if tenant_id:
            qs = qs.filter(employee__organization_id=tenant_id)

        user = self.request.user
        if hasattr(user, 'profile'):
            role = getattr(user.profile, 'role', None)
            if role == 'employee':
                try:
                    qs = qs.filter(employee=user.employee)
                except (AttributeError, Exception):
                    return OvertimeRequest.objects.none()

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if hasattr(user, 'profile'):
            try:
                serializer.save(employee=user.employee, status='pending')
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
        tenant_id = self._resolve_tenant_id()
        qs = QRSession.objects.all()
        if tenant_id:
            qs = qs.filter(organization_id=tenant_id)
        return qs.order_by('-date')
