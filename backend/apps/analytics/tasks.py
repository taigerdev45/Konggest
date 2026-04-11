"""
Konggest — Analytics Celery Tasks (Export PDF/CSV mensuels)

POURQUOI : L'export des KPIs RH mensuels (rapport PDF Direction Générale)
est une opération lourde (jointures + ReportLab). Exécutée de façon synchrone
dans un Web Worker Render, elle provoquerait un timeout HTTP. Celery Worker
l'exécute en arrière-plan sans bloquer les requêtes.

COMMENT :
- generate_monthly_kpi_pdf : agrège les KPIs du mois, génère un PDF ReportLab
  et l'upload dans Supabase Storage bucket 'reports'.
- generate_monthly_kpi_csv : export CSV tabulaire des KPIs par module.
- cleanup_old_reports : supprime les rapports >14j (conforme niveau 2).
  À enregistrer dans CELERY_BEAT_SCHEDULE.
"""
from celery import shared_task
from django.utils import timezone
from datetime import timedelta, date
import io


@shared_task(bind=True, max_retries=2)
def generate_monthly_kpi_pdf(self, tenant_id: str, period_label: str = None):
    """
    Génère un rapport PDF mensuel des KPIs RH et l'upload dans Supabase Storage.
    Déclenché manuellement depuis le frontend ou programmé via CELERY_BEAT_SCHEDULE.
    """
    from django.db.models import Sum, Count, Avg, Q
    from apps.employees.models import Employee
    from apps.payroll.models import Payslip
    from apps.leaves.models import LeaveRequest
    from apps.time_tracking.models import TimeEntry
    from apps.recruitment.models import JobPosting, Application
    from django.conf import settings

    today = date.today()
    first_day = today.replace(day=1)
    label = period_label or today.strftime('%B %Y')

    # Agrégation rapide (identique à KPIDashboardView.get)
    employees = Employee.objects.filter(organization_id=tenant_id)
    total = employees.count()
    active = employees.filter(status='active').count()

    salary_agg = Payslip.objects.filter(
        employee__organization_id=tenant_id,
        period__start_date__gte=first_day,
        status='paid',
    ).aggregate(mass=Sum('net_salary'), avg=Avg('net_salary'), count=Count('id'))

    open_pos = JobPosting.objects.filter(organization_id=tenant_id, status='published').count()
    hired = Application.objects.filter(
        job__organization_id=tenant_id,
        stage='hired',
        created_at__gte=timezone.now() - timedelta(days=30),
    ).count()

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm,
                                topMargin=2*cm, bottomMargin=2*cm)
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=20,
                                     textColor=colors.HexColor('#1e3a5f'))
        normal = styles['Normal']
        content = []

        content.append(Paragraph(f"KONGGEST — Rapport KPI RH {label}", title_style))
        content.append(Spacer(1, 0.5*cm))
        content.append(Paragraph(f"Organisation : {tenant_id}", normal))
        content.append(Paragraph(f"Généré le : {today.strftime('%d/%m/%Y')}", normal))
        content.append(Spacer(1, 1*cm))

        # Table KPIs
        data = [
            ['Indicateur', 'Valeur'],
            ['Effectif total', str(total)],
            ['Employés actifs', str(active)],
            ['Masse salariale nette', f"{float(salary_agg['mass'] or 0):,.0f} FCFA"],
            ['Salaire moyen net', f"{float(salary_agg['avg'] or 0):,.0f} FCFA"],
            ['Fiches de paie payées', str(salary_agg['count'] or 0)],
            ['Postes ouverts', str(open_pos)],
            ['Embauches (30j)', str(hired)],
        ]

        table = Table(data, colWidths=[10*cm, 7*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ]))
        content.append(table)
        doc.build(content)
        buffer.seek(0)
        pdf_bytes = buffer.read()

        # Upload Supabase Storage
        import supabase as sb
        client = sb.create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        file_path = f"reports/{tenant_id}/kpi_{today.strftime('%Y_%m')}.pdf"
        client.storage.from_('reports').upload(
            file_path, pdf_bytes,
            {'content-type': 'application/pdf', 'upsert': 'true'}
        )
        public_url = client.storage.from_('reports').get_public_url(file_path)
        return {'status': 'success', 'url': public_url}

    except Exception as e:
        return {'status': 'error', 'detail': str(e)}


@shared_task(bind=True, max_retries=2)
def generate_monthly_kpi_csv(self, tenant_id: str):
    """
    Génère un export CSV des KPIs mensuels et l'upload dans Supabase Storage.
    """
    from django.db.models import Sum, Count, Avg
    from apps.employees.models import Employee
    from apps.payroll.models import Payslip
    from apps.recruitment.models import JobPosting, Application
    from django.conf import settings
    import csv

    today = date.today()
    first_day = today.replace(day=1)

    employees = Employee.objects.filter(organization_id=tenant_id)
    salary_agg = Payslip.objects.filter(
        employee__organization_id=tenant_id,
        period__start_date__gte=first_day,
        status='paid',
    ).aggregate(mass=Sum('net_salary'), avg=Avg('net_salary'))

    open_pos = JobPosting.objects.filter(organization_id=tenant_id, status='published').count()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(['Indicateur', 'Valeur', 'Periode'])
    period_str = today.strftime('%Y-%m')
    writer.writerow(['Effectif total', employees.count(), period_str])
    writer.writerow(['Employes actifs', employees.filter(status='active').count(), period_str])
    writer.writerow(['Masse salariale nette', float(salary_agg['mass'] or 0), period_str])
    writer.writerow(['Salaire moyen net', float(salary_agg['avg'] or 0), period_str])
    writer.writerow(['Postes ouverts', open_pos, period_str])

    csv_bytes = buffer.getvalue().encode('utf-8-sig')

    try:
        import supabase as sb
        from django.conf import settings
        client = sb.create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        file_path = f"reports/{tenant_id}/kpi_{today.strftime('%Y_%m')}.csv"
        client.storage.from_('reports').upload(
            file_path, csv_bytes,
            {'content-type': 'text/csv', 'upsert': 'true'}
        )
        public_url = client.storage.from_('reports').get_public_url(file_path)
        return {'status': 'success', 'url': public_url}
    except Exception as e:
        return {'status': 'error', 'detail': str(e)}


@shared_task
def cleanup_old_reports():
    """
    Supprime les rapports Supabase Storage de plus de 14 jours.
    Conforme à l'optimisation Niveau 2 (compression + suppression logs >14j).
    À enregistrer dans CELERY_BEAT_SCHEDULE.
    """
    from django.conf import settings
    try:
        import supabase as sb
        client = sb.create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        files = client.storage.from_('reports').list()
        cutoff = (timezone.now() - timedelta(days=14)).isoformat()
        deleted = 0
        for f in (files or []):
            if f.get('created_at', '') < cutoff:
                client.storage.from_('reports').remove([f['name']])
                deleted += 1
        return f"{deleted} rapport(s) supprime(s)"
    except Exception as e:
        return f"Erreur cleanup reports: {e}"
