"""Konggest — Recruitment Models & Views"""
from django.db import models
from rest_framework import viewsets, serializers
from apps.accounts.models import Organization
from core.permissions import IsHRManager


class JobPosting(models.Model):
    STATUS_CHOICES = [('draft', 'Brouillon'), ('published', 'Publié'), ('closed', 'Clôturé')]
    TYPE_CHOICES = [('cdi', 'CDI'), ('cdd', 'CDD'), ('stage', 'Stage'), ('alternance', 'Alternance')]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='job_postings')
    title = models.CharField(max_length=200)
    department = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=200, blank=True)
    contract_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='cdi')
    description = models.TextField()
    requirements = models.TextField(blank=True)
    salary_range = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    published_at = models.DateTimeField(null=True, blank=True)
    closes_at = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Offre d'Emploi"
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Application(models.Model):
    STAGE_CHOICES = [
        ('new', 'Nouveau'), ('screening', 'Présélection'), ('interview', 'Entretien'),
        ('offer', 'Offre'), ('hired', 'Embauché'), ('rejected', 'Refusé'),
    ]
    job = models.ForeignKey(JobPosting, on_delete=models.CASCADE, related_name='applications')
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    resume_url = models.URLField(blank=True)
    cover_letter = models.TextField(blank=True)
    stage = models.CharField(max_length=20, choices=STAGE_CHOICES, default='new')
    notes = models.TextField(blank=True)
    rating = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Candidature"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.first_name} {self.last_name} → {self.job.title}"


class Interview(models.Model):
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='interviews')
    scheduled_at = models.DateTimeField()
    interviewer = models.CharField(max_length=200)
    location = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    outcome = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Entretien"
        ordering = ['scheduled_at']


# ─── Serializers ───
class JobPostingSerializer(serializers.ModelSerializer):
    application_count = serializers.SerializerMethodField()
    class Meta:
        model = JobPosting
        fields = ['id', 'title', 'department', 'location', 'contract_type', 'description',
                  'requirements', 'salary_range', 'status', 'published_at', 'closes_at',
                  'application_count', 'created_at']
    def get_application_count(self, obj):
        return obj.applications.count()

class ApplicationSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source='job.title', read_only=True)
    class Meta:
        model = Application
        fields = ['id', 'job', 'job_title', 'first_name', 'last_name', 'email', 'phone',
                  'resume_url', 'cover_letter', 'stage', 'notes', 'rating', 'created_at']

class InterviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interview
        fields = ['id', 'application', 'scheduled_at', 'interviewer', 'location', 'notes', 'outcome']


# ─── Views ───
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from datetime import date

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
        qs = JobPosting.objects.all()
        if tenant_id:
            qs = qs.filter(organization_id=tenant_id)
        # For public access, only show published jobs
        if not self.request.user or not self.request.user.is_authenticated:
            qs = qs.filter(status='published', closes_at__gte=date.today())
        return qs
    
    def create(self, request, *args, **kwargs):
        """Create job with detailed error logging."""
        import logging
        logger = logging.getLogger('django')
        
        # Log initial pour confirmer que la méthode est appelée
        logger.warning(f"=== JOB CREATE START === User: {request.user}")
        logger.warning(f"Request tenant_id: {getattr(request, 'tenant_id', 'NOT SET')}")
        if hasattr(request.user, 'profile'):
            logger.warning(f"User profile org_id: {getattr(request.user.profile, 'organization_id', 'NOT SET')}")
        else:
            logger.warning(f"User has NO profile attribute")
        
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error creating job: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Erreur création offre: {str(e)}'}, 
                status=500
            )
        
    def perform_create(self, serializer):
        """Create job posting with organization from user profile or tenant_id."""
        import logging
        logger = logging.getLogger('django')
        
        tenant_id = getattr(self.request, 'tenant_id', None)
        logger.warning(f"perform_create - tenant_id from request: {tenant_id}")
        
        # If tenant_id not set, try to get from user profile
        if not tenant_id and hasattr(self.request.user, 'profile'):
            tenant_id = getattr(self.request.user.profile, 'organization_id', None)
            logger.warning(f"perform_create - tenant_id from profile: {tenant_id}")
        
        if not tenant_id:
            logger.error("perform_create - No tenant_id found!")
            raise serializers.ValidationError(
                {'organization': 'Impossible de determiner l organisation. Verifiez votre profil.'}
            )
        
        logger.warning(f"perform_create - Saving with organization_id: {tenant_id}")
        serializer.save(organization_id=tenant_id)
    
    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def apply(self, request, pk=None):
        """Public endpoint for candidates to apply to a job."""
        job = self.get_object()
        
        # Check if job is still open
        if job.status != 'published':
            return Response({'error': 'Cette offre n\'est plus disponible'}, status=400)
        if job.closes_at and job.closes_at < date.today():
            return Response({'error': 'Cette offre est clôturée'}, status=400)
        
        # Validate required fields
        required_fields = ['first_name', 'last_name', 'email']
        for field in required_fields:
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
            resume_url=request.data.get('resume_url', ''),
            stage='new'
        )
        
        return Response({
            'message': 'Votre candidature a été soumise avec succès',
            'application_id': application.id,
            'job_title': job.title
        }, status=201)


class PublicJobSerializer(serializers.ModelSerializer):
    """Public serializer - excludes sensitive fields."""
    class Meta:
        model = JobPosting
        fields = ['id', 'title', 'department', 'location', 'contract_type', 
                  'description', 'requirements', 'salary_range', 'published_at', 'closes_at']


@api_view(['GET'])
@permission_classes([AllowAny])
def public_job_list(request):
    """Public endpoint to list all published jobs."""
    # Filter by organization if provided in query params
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
        resume_url=request.data.get('resume_url', ''),
        stage='new'
    )
    
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
