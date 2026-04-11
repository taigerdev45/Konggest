"""
Konggest — Time Tracking Tasks (Celery)
Version (2026-04-11)

AT14 — check_attendance_anomalies : Celery beat, détection retards/absences à 10h
AT15 — cleanup_old_time_entries   : suppression logs > TIME_ENTRY_RETENTION_DAYS
       cleanup_old_qr_sessions    : suppression QR sessions > QR_SESSION_RETENTION_DAYS

INSTALLATION Celery Beat (settings.py) :
  CELERY_BEAT_SCHEDULE = {
      'check-anomalies-daily': {
          'task': 'apps.time_tracking.tasks.check_attendance_anomalies',
          'schedule': crontab(hour=10, minute=0, day_of_week='1-5'),  # Lun-Ven à 10h
      },
      'cleanup-logs-weekly': {
          'task': 'apps.time_tracking.tasks.cleanup_old_time_entries',
          'schedule': crontab(hour=2, minute=0, day_of_week=0),  # Dimanche 2h
      },
      'cleanup-qr-daily': {
          'task': 'apps.time_tracking.tasks.cleanup_old_qr_sessions',
          'schedule': crontab(hour=1, minute=0),  # Chaque nuit 1h
      },
  }
"""
import logging
from datetime import date, timedelta, datetime

logger = logging.getLogger('konggest.time_tracking.tasks')


def _celery_available():
    try:
        from celery import shared_task  # noqa
        return True
    except ImportError:
        return False


# ─── Détection anomalies — AT14 ────────────────────────────────────────────────

def check_attendance_anomalies_impl():
    """
    AT14 — Vérifie retards et absences pour toutes les organisations.
    Déclenché à 10h en semaine (Celery beat) ou via endpoint /anomalies/.
    Retourne un dict résumé.
    """
    from apps.employees.models import Employee
    from apps.accounts.models import Organization
    from .models import TimeEntry
    from core.hr_settings import WORK_START_HOUR, LATE_THRESHOLD_MINUTES

    today = date.today()
    work_start = datetime.strptime(WORK_START_HOUR, "%H:%M").time()
    results = {}

    for org in Organization.objects.filter(is_active=True):
        # Employés actifs
        active_employees = Employee.objects.filter(
            organization=org, status='active'
        )
        total = active_employees.count()

        present_ids = TimeEntry.objects.filter(
            employee__organization=org,
            date=today,
        ).values_list('employee_id', flat=True)

        absent_count = active_employees.exclude(id__in=present_ids).count()

        # Retards (check_in > 09:00 + tolérance)
        late_entries = TimeEntry.objects.filter(
            employee__organization=org,
            date=today,
        ).exclude(check_in__lte=work_start)

        late_count = late_entries.count()
        logger.info(
            f"AT14 Anomalies — {org.name}: {absent_count} absent(s), {late_count} retard(s) / {total} actifs"
        )
        results[str(org.id)] = {
            'org': org.name,
            'total': total,
            'present': len(present_ids),
            'absent': absent_count,
            'late': late_count,
        }

    return results


# ─── Nettoyage des anciens pointages — AT15 ────────────────────────────────────

def cleanup_old_time_entries_impl():
    """
    AT15 — Supprime les TimeEntry archivés au-delà de TIME_ENTRY_RETENTION_DAYS.
    Conformité : Code du travail gabonais impose 1 an minimum. On conserve 14 mois.
    NE supprime PAS les 14 derniers mois.
    """
    from .models import TimeEntry
    from core.hr_settings import TIME_ENTRY_RETENTION_DAYS

    cutoff_date = date.today() - timedelta(days=TIME_ENTRY_RETENTION_DAYS)
    deleted_count, _ = TimeEntry.objects.filter(date__lt=cutoff_date).delete()
    logger.info(f"AT15 Cleanup TimeEntry: {deleted_count} entrées supprimées (avant {cutoff_date})")
    return deleted_count


def cleanup_old_qr_sessions_impl():
    """
    AT15 — Supprime les QRSession expirées au-delà de QR_SESSION_RETENTION_DAYS.
    """
    from .models import QRSession, QRScan
    from core.hr_settings import QR_SESSION_RETENTION_DAYS
    from django.utils import timezone

    cutoff = timezone.now() - timedelta(days=QR_SESSION_RETENTION_DAYS)
    old_sessions = QRSession.objects.filter(expires_at__lt=cutoff)
    # Supprimer en cascade (QRScan.on_delete=CASCADE)
    count = old_sessions.count()
    old_sessions.delete()
    logger.info(f"AT15 Cleanup QRSession: {count} sessions QR supprimées (expirées avant {cutoff.date()})")
    return count


# ─── Wrappers Celery (si disponible) ───────────────────────────────────────────

if _celery_available():
    from celery import shared_task

    @shared_task(bind=True, max_retries=3, default_retry_delay=300)
    def check_attendance_anomalies(self):
        """AT14 — Celery task : détection retards/absences à 10h (lun-ven)."""
        try:
            return check_attendance_anomalies_impl()
        except Exception as exc:
            logger.error(f"AT14 check_attendance_anomalies error: {exc}")
            self.retry(exc=exc)

    @shared_task(bind=True, max_retries=2)
    def cleanup_old_time_entries(self):
        """AT15 — Celery task : nettoyage logs >14 mois (dimanche 2h)."""
        try:
            return cleanup_old_time_entries_impl()
        except Exception as exc:
            logger.error(f"AT15 cleanup_old_time_entries error: {exc}")
            self.retry(exc=exc)

    @shared_task(bind=True, max_retries=2)
    def cleanup_old_qr_sessions(self):
        """AT15 — Celery task : nettoyage QR sessions >14j (chaque nuit 1h)."""
        try:
            return cleanup_old_qr_sessions_impl()
        except Exception as exc:
            logger.error(f"AT15 cleanup_old_qr_sessions error: {exc}")
            self.retry(exc=exc)
