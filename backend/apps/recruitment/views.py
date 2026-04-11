from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from django.db.models import Count
from datetime import date
from django.conf import settings
import logging
import tempfile
import os
import threading
import requests

from core.permissions import IsHRManager
from core.cache import cache_response
from apps.recruitment.models import JobPosting, Application, Interview
from apps.recruitment.serializers import JobPostingSerializer, PublicJobSerializer, ApplicationSerializer, InterviewSerializer
from apps.recruitment.tasks import process_and_upload_resume, send_application_confirmation

logger = logging.getLogger(__name__)

def _broadcast_realtime_async(tenant_id, event, payload):
    supabase_url = getattr(settings, 'SUPABASE_URL', '')
    key = getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', '')
    if not (supabase_url and key):
        return
    url = f"{supabase_url}/realtime/v1/api/broadcast"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    data = {
        "messages": [{
            "topic": "konggest_public_recruitment",
            "event": event,
            "payload": payload
        }]
    }
    threading.Thread(target=lambda: requests.post(url, headers=headers, json=data)).start()

class JobPostingViewSet(viewsets.ModelViewSet):
    serializer_class = JobPostingSerializer
    permission_classes = [IsHRManager]
    filterset_fields = ['status', 'contract_type']
    search_fields = ['title', 'department']
    
    def get_permissions(self):
        """Allow public read access to published jobs."""
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return super().get_permissions()
    
    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        # R3: Resolver N+1 count() via annotate
        qs = JobPosting.objects.annotate(application_count=Count('applications'))
        if tenant_id:
            qs = qs.filter(organization_id=tenant_id)
        # For public access, only show published jobs
        if not self.request.user or not self.request.user.is_authenticated:
            qs = qs.filter(status='published', closes_at__gte=date.today())
        return qs
        
    def perform_create(self, serializer):
        """Create job posting with organization from user profile or tenant_id."""
        tenant_id = getattr(self.request, 'tenant_id', None)
        
        if not tenant_id and hasattr(self.request.user, 'profile'):
            tenant_id = getattr(self.request.user.profile, 'organization_id', None)
        
        if not tenant_id:
            from rest_framework import serializers
            raise serializers.ValidationError(
                {'organization': 'Impossible de determiner l organisation. Verifiez votre profil.'}
            )
        
        serializer.save(organization_id=tenant_id)


@api_view(['GET'])
@permission_classes([AllowAny])
@cache_response(timeout=120)  # R4: Caching Redis sur le trafic viral
def public_job_list(request):
    """Public endpoint to list all published jobs."""
    org_id = request.query_params.get('org')
    jobs = JobPosting.objects.filter(
        status='published',
        closes_at__gte=date.today()
    )
    if org_id:
        jobs = jobs.filter(organization_id=org_id)
    
    serializer = PublicJobSerializer(jobs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_job_detail(request, pk):
    """Public endpoint to view a specific job."""
    try:
        job = JobPosting.objects.get(
            pk=pk, 
            status='published',
            closes_at__gte=date.today()
        )
        serializer = PublicJobSerializer(job)
        return Response(serializer.data)
    except JobPosting.DoesNotExist:
        return Response({'error': 'Offre non trouvée'}, status=404)


@api_view(['POST'])
@permission_classes([AllowAny])
def public_apply(request, job_id):
    """Public endpoint to apply for a job."""
    try:
        job = JobPosting.objects.get(
            pk=job_id,
            status='published',
            closes_at__gte=date.today()
        )
    except JobPosting.DoesNotExist:
        return Response({'error': 'Offre non trouvée ou clôturée'}, status=404)
    
    # Validate required fields
    required = ['first_name', 'last_name', 'email']
    for field in required:
        if not request.data.get(field):
            return Response({'error': f'{field} est requis'}, status=400)
    
    # Create application
    application = Application.objects.create(
        job=job,
        first_name=request.data.get('first_name'),
        last_name=request.data.get('last_name'),
        email=request.data.get('email'),
        phone=request.data.get('phone', ''),
        cover_letter=request.data.get('cover_letter', ''),
        stage='new'
    )

    # R5: Gestion des Fichiers (Multipart config) avec Celery
    resume_file = request.FILES.get('resume')
    if resume_file:
        fd, temp_path = tempfile.mkstemp(suffix=os.path.splitext(resume_file.name)[1])
        with os.fdopen(fd, 'wb') as f:
            for chunk in resume_file.chunks():
                f.write(chunk)
        
        # Dispatch Celery
        process_and_upload_resume.delay(
            application.id, temp_path, resume_file.name, resume_file.content_type
        )
    else:
        # Check if plain API fallback URL
        resume_url = request.data.get('resume_url', '')
        if resume_url:
            application.resume_url = resume_url
            application.save()

    # R6: Broadcast Realtime (WebSockets)
    _broadcast_realtime_async(str(job.organization.id), 'new_application', {
        'application_id': application.id,
        'job_title': job.title,
        'candidate_name': f"{application.first_name} {application.last_name}"
    })
    
    # R9: Email de confirmation
    send_application_confirmation.delay(application.id)
    
    return Response({
        'message': 'Candidature soumise avec succès',
        'application_id': application.id
    }, status=201)


class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer
    permission_classes = [IsHRManager]
    filterset_fields = ['job', 'stage']
    search_fields = ['first_name', 'last_name', 'email']
    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = Application.objects.select_related('job')
        return qs.filter(job__organization_id=tenant_id) if tenant_id else qs

class InterviewViewSet(viewsets.ModelViewSet):
    serializer_class = InterviewSerializer
    permission_classes = [IsHRManager]
    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = Interview.objects.select_related('application__job')
        return qs.filter(application__job__organization_id=tenant_id) if tenant_id else qs
