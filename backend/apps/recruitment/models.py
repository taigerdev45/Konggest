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
class JobPostingViewSet(viewsets.ModelViewSet):
    serializer_class = JobPostingSerializer
    permission_classes = [IsHRManager]
    filterset_fields = ['status', 'contract_type']
    search_fields = ['title', 'department']
    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = JobPosting.objects.all()
        return qs.filter(organization_id=tenant_id) if tenant_id else qs
    def perform_create(self, serializer):
        serializer.save(organization_id=self.request.tenant_id)

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
