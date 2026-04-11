"""
Konggest — Employees Models
Version optimisée finale (2026-04-11)

Corrections :
  - T13 : Index sur `email` (db_index=True) pour recherches rapides par Supabase Auth
  - T17 : `site_location` SUPPRIMÉ définitivement (migration 0006_remove_site_location)
  - `seniority_years` protégé contre hire_date None
  - `ArchivedEmployee` enrichi avec hire_date + cnss_number + contract_type
  - Index composites optimisés (organization + status/department/location/contract_type/is_expat)

Architecture target : Django monolithe → microservices extraits progressivement.
"""
from django.db import models
from apps.accounts.models import Organization


class Department(models.Model):
    """Company department."""
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name='departments'
    )
    name = models.CharField(max_length=100, verbose_name="Nom")
    description = models.TextField(blank=True)
    manager = models.ForeignKey(
        'Employee', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='managed_department'
    )
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='sub_departments'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Département"
        unique_together = ['organization', 'name']
        ordering = ['name']
        indexes = [
            models.Index(fields=['organization', 'is_active']),
        ]

    def __str__(self):
        return self.name


class Position(models.Model):
    """Job position/title."""
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name='positions'
    )
    title = models.CharField(max_length=100, verbose_name="Intitulé du poste")
    description = models.TextField(blank=True)
    department = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='positions'
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Poste"
        ordering = ['title']
        indexes = [
            models.Index(fields=['organization', 'is_active']),
        ]

    def __str__(self):
        return self.title


class Location(models.Model):
    """Company site or branch location."""
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name='locations'
    )
    name = models.CharField(max_length=100, verbose_name="Nom du site/lieu")
    address = models.TextField(blank=True, verbose_name="Adresse")
    city = models.CharField(max_length=100, blank=True, verbose_name="Ville")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Lieu/Site"
        unique_together = ['organization', 'name']
        ordering = ['name']

    def __str__(self):
        return self.name


class Employee(models.Model):
    """Employee master record — Base centrale de toutes les opérations RH."""

    CONTRACT_CHOICES = [
        ('cdi', 'CDI'),
        ('cdd', 'CDD'),
        ('interim', 'Intérim'),
        ('stage', 'Stage'),
        ('apprentissage', 'Apprentissage'),
        ('freelance', 'Freelance'),
    ]
    GENDER_CHOICES = [
        ('M', 'Masculin'),
        ('F', 'Féminin'),
        ('O', 'Autre'),
    ]
    STATUS_CHOICES = [
        ('active', 'Actif'),
        ('on_leave', 'En congé'),
        ('suspended', 'Suspendu'),
        ('terminated', 'Terminé'),
    ]
    SECTOR_CHOICES = [
        ('petrole', 'Pétrole & Mines'),
        ('bois', 'Exploitation Forestière'),
        ('btp', 'BTP & Construction'),
        ('agro', 'Agro-industrie'),
        ('commerce', 'Commerce & Services'),
    ]

    # --- Identité ---
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name='employees'
    )
    user = models.OneToOneField(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='employee'
    )
    employee_id = models.CharField(max_length=20, verbose_name="Matricule")
    cnss_number = models.CharField(max_length=20, blank=True, verbose_name="Numéro CNSS")
    first_name = models.CharField(max_length=100, verbose_name="Prénom")
    last_name = models.CharField(max_length=100, verbose_name="Nom")
    # FIX T13 : index sur email pour les recherches et lookups Supabase Auth
    email = models.EmailField(verbose_name="Email", db_index=True)
    phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True)
    date_of_birth = models.DateField(null=True, blank=True, verbose_name="Date de naissance")
    address = models.TextField(blank=True, verbose_name="Adresse")
    nationality = models.CharField(max_length=50, blank=True, verbose_name="Nationalité")
    is_expat = models.BooleanField(default=False, verbose_name="Expatrié")

    # --- Informations professionnelles ---
    department = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, related_name='employees'
    )
    position = models.ForeignKey(
        Position, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='employees'
    )
    location = models.ForeignKey(
        Location, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='employees', verbose_name="Site/Lieu"
    )
    # T17 : site_location supprimé — utiliser location (FK) pour tous les accès site
    sector = models.CharField(
        max_length=50, choices=SECTOR_CHOICES, default='commerce', verbose_name="Secteur"
    )
    manager = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='subordinates'
    )
    contract_type = models.CharField(max_length=20, choices=CONTRACT_CHOICES, default='cdi')
    hire_date = models.DateField(verbose_name="Date d'embauche")
    end_date = models.DateField(null=True, blank=True, verbose_name="Date de fin")

    # --- Données sensibles (Premium) ---
    # NOTE SÉCURITÉ : exposé uniquement via EmployeeDetailSerializer avec RBAC strict
    salary = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, verbose_name="Salaire brut"
    )
    family_parts = models.DecimalField(
        max_digits=3, decimal_places=1, default=1.0, verbose_name="Parts IRPP"
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    # --- Contact urgence ---
    emergency_contact_name = models.CharField(max_length=200, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)

    photo = models.URLField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Employé"
        unique_together = ['organization', 'employee_id']
        ordering = ['last_name', 'first_name']
        indexes = [
            # FIX niveau 1 : index composites pour RLS + filtres fréquents
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['organization', 'department']),
            models.Index(fields=['organization', 'location']),
            models.Index(fields=['organization', 'contract_type']),
            models.Index(fields=['organization', 'is_expat']),
            # Pour les stats dashboard
            models.Index(fields=['organization', 'hire_date']),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.employee_id})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def seniority_years(self):
        """
        Calcule l'ancienneté en années.
        FIX : protégé contre hire_date=None pour éviter AttributeError.
        """
        if not self.hire_date:
            return 0
        from django.utils import timezone
        from dateutil.relativedelta import relativedelta
        delta = relativedelta(timezone.now().date(), self.hire_date)
        return delta.years


class ArchivedEmployee(models.Model):
    """
    Archive des employés supprimés — traçabilité RH.
    Enrichi avec hire_date pour calcul d'ancienneté précis.
    """
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name='archived_employees'
    )
    full_name = models.CharField(max_length=200, verbose_name="Nom complet")
    email = models.EmailField(verbose_name="Email")
    phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    position = models.CharField(max_length=100, blank=True, verbose_name="Poste / Rôle")
    department = models.CharField(max_length=100, blank=True, verbose_name="Département")
    seniority = models.CharField(max_length=50, blank=True, verbose_name="Ancienneté")
    # Ajout : date embauche pour reconstitution historique
    hire_date = models.DateField(null=True, blank=True, verbose_name="Date d'embauche")
    contract_type = models.CharField(max_length=20, blank=True, verbose_name="Type de contrat")
    cnss_number = models.CharField(max_length=20, blank=True, verbose_name="N° CNSS")
    deleted_at = models.DateTimeField(auto_now_add=True)
    deleted_by = models.EmailField(blank=True, verbose_name="Supprimé par")

    class Meta:
        verbose_name = "Ancien Employé"
        ordering = ['-deleted_at']
        indexes = [
            models.Index(fields=['organization', 'deleted_at']),
        ]

    def __str__(self):
        return f"{self.full_name} (Archivé le {self.deleted_at.date() if self.deleted_at else '?'})"
