"""Konggest — Accounts Models (Multi-tenant & SaaS Admin)"""
from django.db import models
from django.contrib.auth.models import User


class Organization(models.Model):
    """Tenant/Company model for multi-tenant SaaS."""
    PLAN_CHOICES = [
        ('starter', 'Starter (Indépendant/PME)'),
        ('pro', 'Pro (Entreprise en croissance)'),
        ('premium', 'Premium (Grande Entreprise)'),
        ('legacy', 'Ancien Plan'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Actif'),
        ('past_due', 'Paiement en attente'),
        ('canceled', 'Résilié'),
        ('suspended', 'Suspendu'),
    ]

    name = models.CharField(max_length=200, verbose_name="Nom de l'entreprise")
    slug = models.SlugField(unique=True)
    sector = models.CharField(max_length=100, blank=True, verbose_name="Secteur d'activité")
    logo = models.URLField(blank=True, verbose_name="Logo URL")
    
    # Billing & Subscription
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='starter')
    subscription_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    max_employees = models.IntegerField(default=10, help_text="Limite d'employés selon le plan")
    
    # Module Provisioning
    activated_modules = models.JSONField(
        default=dict, 
        blank=True, 
        help_text="Modules activés: {'recruitment': true, 'payroll': true, ...}"
    )
    
    address = models.TextField(blank=True, verbose_name="Adresse")
    phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    email = models.EmailField(blank=True, verbose_name="Email")
    website = models.URLField(blank=True)
    
    is_active = models.BooleanField(default=True)
    is_trusted_partner = models.BooleanField(default=False, verbose_name="Partenaire de confiance")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Organisation"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} [{self.plan}]"

    def can_add_employee(self):
        """Logic for quota check."""
        # This will be used in serializers/views
        return self.employees_count < self.max_employees

    @property
    def employees_count(self):
        # Using late import to avoid circular dependency
        from apps.employees.models import Employee
        return Employee.objects.filter(organization=self).count()


class UserProfile(models.Model):
    """Extended user profile with role and organization."""
    ROLE_CHOICES = [
        ('admin', 'Administrateur'),
        ('hr', 'Ressources Humaines'),
        ('manager', 'Manager'),
        ('employee', 'Employé'),
        ('support', 'Support Technique'),
        ('commercial', 'Agent Commercial'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='members', null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')
    avatar = models.URLField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Profil Utilisateur"

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.role})"


class AuditLog(models.Model):
    """Audit trail for all important actions."""
    ACTION_CHOICES = [
        ('create', 'Création'),
        ('update', 'Modification'),
        ('delete', 'Suppression'),
        ('login', 'Connexion'),
        ('logout', 'Déconnexion'),
        ('export', 'Export'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, null=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=50)
    resource_id = models.CharField(max_length=50, blank=True)
    details = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True)
    user_agent = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Journal d'Audit"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', '-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]

    def __str__(self):
        return f"{self.user} - {self.action} - {self.resource_type}"


class LoginAttempt(models.Model):
    """Track login attempts for brute force detection."""
    email = models.EmailField()
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True, null=True)
    success = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Tentative de Connexion"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email', '-created_at']),
            models.Index(fields=['ip_address', '-created_at']),
        ]


class SaaSAdmin(models.Model):
    """Platform-level administrators (SaaS owners)."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='saas_admin')
    supabase_id = models.UUIDField(unique=True, null=True, blank=True, verbose_name="UUID Supabase")
    is_super_admin = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Administrateur SaaS"
        verbose_name_plural = "Administrateurs SaaS"

    def __str__(self):
        return f"SaaS Admin: {self.user.email}"


class Invoice(models.Model):
    """Platform-level billings for client organizations."""
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('paid', 'Payé'),
        ('overdue', 'En retard'),
        ('canceled', 'Annulé'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='invoices')
    invoice_number = models.CharField(max_length=50, unique=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=10, default='FCFA')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    period_start = models.DateField()
    period_end = models.DateField()
    due_date = models.DateField()
    
    file_url = models.URLField(blank=True, help_text="Lien vers la facture PDF stockée sur Supabase Storage")
    
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Facture"
        ordering = ['-created_at']

    def __str__(self):
        return f"Facture {self.invoice_number} - {self.organization.name}"
