"""
Konggest — Analytics Views (KPI RH Centralisé)

POURQUOI : Le dashboard affichait des valeurs hardcodées (masse salariale
"452M FCFA", taux de présence "96.8%", activité fictive "Thomas Moreau").
Ceci est un risque décisionnel critique : un DRH prenait des décisions
sur des données inventées.

COMMENT :
- Un seul endpoint GET /api/analytics/kpis/ agrège toutes les données RH
  en requêtes SQL optimisées (annotate, aggregate, filter) côté Django.
- Cache Redis 5 minutes (@cache_response) pour protéger les IOPS Supabase.
- Isolation multi-tenant systématique : TOUT filtre par organization_id.
- Activité récente branchée sur le vrai AuditLog (plus de RECENT_ACTIVITY_MOCK).
- Calculs réels : masse salariale (SUM payslips), présence (TimeEntry/mois),
  absentéisme (LeaveRequest approved), recrutement (JobPosting + Application).
- Broadcast Supabase Realtime sur le channel kpi:{tenant_id} déclenché
  depuis les autres modules sur mutations critiques (paie validée, employé créé).
"""
from datetime import date, timedelta
from django.db.models import Sum, Count, Avg, Q, F
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import threading

from core.cache import cache_response
from apps.employees.models import Employee
from apps.payroll.models import Payslip, PayrollPeriod
from apps.leaves.models import LeaveRequest
from apps.time_tracking.models import TimeEntry
from apps.recruitment.models import JobPosting, Application
from apps.accounts.models import AuditLog
import logging

try:
    from apps.expenses.models import Expense
    _HAS_EXPENSES = True
except ImportError:
    _HAS_EXPENSES = False

try:
    from apps.performance.models import PerformanceReview
    _HAS_PERFORMANCE = True
except ImportError:
    _HAS_PERFORMANCE = False

logger = logging.getLogger('konggest.analytics')


def _resolve_tenant_id(request):
    """Résolution robuste du tenant_id (middleware → profil)."""
    tenant_id = getattr(request, 'tenant_id', None)
    if not tenant_id:
        try:
            tenant_id = request.user.profile.organization_id
        except Exception:
            pass
    return tenant_id


class KPIDashboardView(APIView):
    """
    GET /api/analytics/kpis/
    Retourne les KPIs RH consolidés pour le dashboard.
    Cache Redis 5 minutes — 1 seul appel remplace ~8 appels disparates.
    """
    permission_classes = [IsAuthenticated]

    @cache_response(timeout=300, key_prefix='analytics_kpis')
    def get(self, request):
        tenant_id = _resolve_tenant_id(request)
        if not tenant_id:
            return Response({'error': 'Organisation non identifiée.'}, status=403)

        today = date.today()
        first_day_month = today.replace(day=1)
        thirty_days_ago = today - timedelta(days=30)
        working_days_month = self._count_working_days(first_day_month, today)

        # ── 1. KPIs Effectifs ──────────────────────────────────────────────
        employees = Employee.objects.filter(organization_id=tenant_id)
        total_employees = employees.count()
        active_employees = employees.filter(status='active').count()
        on_leave_now = employees.filter(status='on_leave').count()
        terminated = employees.filter(status='terminated').count()
        turnover_rate = round(terminated / total_employees * 100, 2) if total_employees > 0 else 0
        expat_ratio = round(
            employees.filter(is_expat=True).count() / total_employees * 100, 1
        ) if total_employees > 0 else 0

        # ── 2. KPI Masse Salariale Réelle ──────────────────────────────────
        # Payslips payés du mois courant pour ce tenant
        salary_agg = Payslip.objects.filter(
            employee__organization_id=tenant_id,
            period__start_date__gte=first_day_month,
            status='paid',
        ).aggregate(
            mass_salary=Sum('net_salary'),
            avg_salary=Avg('net_salary'),
            total_deductions=Sum('total_deductions'),
            count=Count('id'),
        )
        mass_salary = float(salary_agg['mass_salary'] or 0)
        avg_salary = float(salary_agg['avg_salary'] or 0)
        total_deductions = float(salary_agg['total_deductions'] or 0)
        paid_payslips_count = salary_agg['count'] or 0

        # Salaires en attente (draft/validated)
        pending_payslips = Payslip.objects.filter(
            employee__organization_id=tenant_id,
            period__start_date__gte=first_day_month,
        ).exclude(status='paid').count()

        # ── 3. KPI Présence / Absentéisme ─────────────────────────────────
        # Jours de présence = TimeEntry du mois × employés actifs
        present_this_month = TimeEntry.objects.filter(
            employee__organization_id=tenant_id,
            date__gte=first_day_month,
            date__lte=today,
        ).count()

        # Jours théoriques = jours ouvrés × employés actifs
        theoretical_days = working_days_month * active_employees if active_employees > 0 else 1

        attendance_rate = round(present_this_month / theoretical_days * 100, 1) if theoretical_days > 0 else 0
        absenteeism_rate = round(100 - attendance_rate, 1)

        # Congés approuvés ce mois (jours)
        leaves_this_month = LeaveRequest.objects.filter(
            organization_id=tenant_id,
            status='approved',
            start_date__lte=today,
            end_date__gte=first_day_month,
        ).aggregate(total_days=Sum('days_count'))
        total_leave_days = float(leaves_this_month['total_days'] or 0)

        # Congés en attente
        pending_leaves = LeaveRequest.objects.filter(
            organization_id=tenant_id,
            status='pending',
        ).count()

        # Congés restants moyen (approximation : quota annuel - jours pris)
        # Le quota standard gabonais est de 24 jours ouvrés / an
        GABON_ANNUAL_LEAVE_QUOTA = 24
        avg_leave_remaining = round(
            GABON_ANNUAL_LEAVE_QUOTA - (total_leave_days / active_employees)
        , 1) if active_employees > 0 else GABON_ANNUAL_LEAVE_QUOTA

        # ── 4. KPI Recrutement ─────────────────────────────────────────────
        open_positions = JobPosting.objects.filter(
            organization_id=tenant_id,
            status='published',
        ).count()

        active_applications = Application.objects.filter(
            job__organization_id=tenant_id,
        ).exclude(stage__in=['hired', 'rejected']).count()

        hired_last_30d = Application.objects.filter(
            job__organization_id=tenant_id,
            stage='hired',
            created_at__gte=timezone.now() - timedelta(days=30),
        ).count()

        total_applications_30d = Application.objects.filter(
            job__organization_id=tenant_id,
            created_at__gte=timezone.now() - timedelta(days=30),
        ).count()

        conversion_rate = round(
            hired_last_30d / total_applications_30d * 100, 1
        ) if total_applications_30d > 0 else 0

        # ── 5. KPI Dépenses ────────────────────────────────────────────────
        expenses_total = 0
        expenses_pending = 0
        if _HAS_EXPENSES:
            exp_agg = Expense.objects.filter(
                employee__organization_id=tenant_id,
                date__gte=first_day_month,
            ).aggregate(
                total=Sum('amount'),
                pending_count=Count('id', filter=Q(status='pending')),
            )
            expenses_total = float(exp_agg['total'] or 0)
            expenses_pending = exp_agg['pending_count'] or 0

        # ── 6. Activité Récente (vrai AuditLog) ───────────────────────────
        ACTION_LABELS = {
            'create': 'Création',
            'update': 'Modification',
            'delete': 'Suppression',
            'login': 'Connexion',
            'export': 'Export',
        }
        RESOURCE_LABELS = {
            'employee': 'Employé',
            'payslip': 'Fiche de paie',
            'leave': 'Congé',
            'payroll': 'Paie',
            'job': 'Offre d\'emploi',
            'review': 'Évaluation',
        }
        recent_logs = AuditLog.objects.filter(
            organization_id=tenant_id,
        ).select_related('user').order_by('-created_at')[:8]

        recent_activity = []
        now = timezone.now()
        for log in recent_logs:
            delta = now - log.created_at
            if delta.days > 0:
                time_str = f'Il y a {delta.days}j'
            elif delta.seconds > 3600:
                time_str = f'Il y a {delta.seconds // 3600}h'
            else:
                time_str = f'Il y a {delta.seconds // 60}min'

            action_label = ACTION_LABELS.get(log.action, log.action)
            resource_label = RESOURCE_LABELS.get(log.resource_type, log.resource_type)
            detail = log.details.get('full_name', '') or log.details.get('name', '') or f'#{log.resource_id}'

            recent_activity.append({
                'action': f'{action_label} — {resource_label}',
                'detail': detail,
                'time': time_str,
                'resource_type': log.resource_type,
                'actor': log.user.get_full_name() if log.user else 'Système',
            })

        return Response({
            # Effectifs
            'employees': {
                'total': total_employees,
                'active': active_employees,
                'on_leave': on_leave_now,
                'turnover_rate': turnover_rate,
                'expat_ratio': expat_ratio,
            },
            # Paie
            'payroll': {
                'mass_salary': mass_salary,
                'avg_salary': avg_salary,
                'total_deductions': total_deductions,
                'paid_count': paid_payslips_count,
                'pending_count': pending_payslips,
            },
            # Présence
            'attendance': {
                'rate': attendance_rate,
                'absenteeism_rate': absenteeism_rate,
                'present_days_month': present_this_month,
                'total_leave_days': total_leave_days,
                'avg_leave_remaining': avg_leave_remaining,
                'pending_leaves': pending_leaves,
            },
            # Recrutement
            'recruitment': {
                'open_positions': open_positions,
                'active_applications': active_applications,
                'hired_last_30d': hired_last_30d,
                'conversion_rate': conversion_rate,
            },
            # Dépenses
            'expenses': {
                'total_this_month': expenses_total,
                'pending_count': expenses_pending,
            },
            # Activité récente réelle
            'recent_activity': recent_activity,
            # Métadonnées
            '_meta': {
                'computed_at': today.isoformat(),
                'working_days_month': working_days_month,
                'tenant_id': str(tenant_id),
            },
        })

    @staticmethod
    def _count_working_days(start: date, end: date) -> int:
        """Compte les jours ouvrés (lun–ven) entre deux dates."""
        count = 0
        current = start
        while current <= end:
            if current.weekday() < 5:  # 0=lun, 4=ven
                count += 1
            current += timedelta(days=1)
        return max(count, 1)


def _broadcast_realtime_async(tenant_id: str, event: str, payload: dict) -> None:
    """
    Broadcast Supabase Realtime non-bloquant sur le channel kpi:{tenant_id}.
    Appelé depuis les autres modules (payroll.views, employees.views) sur
    mutations critiques (paie validée, employé créé/supprimé).
    """
    def _task():
        import urllib.request
        import json
        from django.conf import settings as s

        url = getattr(s, 'SUPABASE_URL', '')
        key = getattr(s, 'SUPABASE_SERVICE_ROLE_KEY', '')
        if not (url and key):
            return

        endpoint = f"{url}/realtime/v1/api/broadcast"
        body = json.dumps({
            "messages": [{
                "topic": f"kpi:{tenant_id}",
                "event": event,
                "payload": payload,
            }]
        }).encode('utf-8')

        req = urllib.request.Request(
            endpoint,
            data=body,
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            method='POST',
        )
        try:
            urllib.request.urlopen(req, timeout=4)
        except Exception as e:
            logger.warning(f"Analytics Realtime broadcast echec ({event}): {e}")

    threading.Thread(target=_task, daemon=True).start()
