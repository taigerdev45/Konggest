from celery import shared_task
from django.conf import settings
from supabase import create_client, Client
from apps.planning.models import Schedule
import os
import tempfile
import time
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

def get_supabase_client() -> Client:
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_ROLE_KEY
    return create_client(url, key)

@shared_task
def generate_monthly_schedule_pdf(tenant_id: int, month: str, user_email: str):
    """
    month format: 'YYYY-MM'
    Generate a PDF of all public schedules for the organization for that month.
    """
    try:
        year_str, month_str = month.split('-')
        year = int(year_str)
        month_int = int(month_str)
        
        # 1. Fetch data
        schedules = Schedule.objects.filter(
            organization_id=tenant_id,
            date__year=year,
            date__month=month_int,
            status='published'
        ).select_related('employee').order_by('date', 'employee__last_name')
        
        if not schedules.exists():
            return "No schedules found."
            
        # 2. Generate PDF locally
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            filename = tmp_file.name
            
        doc = SimpleDocTemplate(filename, pagesize=landscape(A4))
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        title = Paragraph(f"Planning - {month}", styles['Title'])
        elements.append(title)
        elements.append(Spacer(1, 20))
        
        # Prepare Data Table
        # Columns: Date, Employee, Start Time, End Time
        data = [
            ['Date', 'Employé', 'Début', 'Fin']
        ]
        
        for sched in schedules:
            data.append([
                sched.date.strftime("%d/%m/%Y"),
                f"{sched.employee.first_name} {sched.employee.last_name}",
                sched.start_time.strftime("%H:%M"),
                sched.end_time.strftime("%H:%M")
            ])
            
        t = Table(data, colWidths=[100, 200, 100, 100])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F3F4F6')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#1F2937')),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('BACKGROUND', (0,1), (-1,-1), colors.white),
            ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#E5E7EB')),
        ]))
        
        elements.append(t)
        doc.build(elements)
        
        # 3. Upload to Supabase Storage
        supabase = get_supabase_client()
        bucket_name = "plannings"
        file_path = f"{tenant_id}/planning_{month}_{int(time.time())}.pdf"
        
        with open(filename, "rb") as f:
            supabase.storage.from_(bucket_name).upload(
                file_path, 
                f.read(),
                {"content-type": "application/pdf"}
            )
            
        # Optional: Send email with link or notification here
        
        # Clean local file
        os.remove(filename)
        return f"Successfully generated and uploaded {file_path}"
        
    except Exception as e:
        # Logging or handling
        return str(e)
