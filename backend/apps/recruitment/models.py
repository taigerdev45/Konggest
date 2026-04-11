"""Konggest — Recruitment Models"""
from django.db import models
from apps.accounts.models import Organization

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
        indexes = [
            models.Index(fields=['organization', 'status'], name='job_org_status_idx'),
        ]

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
    resume_url = models.URLField(max_length=1024, blank=True)
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
