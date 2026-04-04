"""Konggest — Employees Models"""
from django.db import models
from apps.accounts.models import Organization


class Department(models.Model):
    """Company department."""
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='departments')
    name = models.CharField(max_length=100, verbose_name="Nom")
    description = models.TextField(blank=True)
    manager = models.ForeignKey('Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_department')
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='sub_departments')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Département"
        unique_together = ['organization', 'name']
        ordering = ['name']

    def __str__(self):
        return self.name


class Position(models.Model):
    """Job position/title."""
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='positions')
    title = models.CharField(max_length=100, verbose_name="Intitulé du poste")
    description = models.TextField(blank=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='positions')
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Poste"
        ordering = ['title']

    def __str__(self):
        return self.title


class Location(models.Model):
    """Company site or branch location."""
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='locations')
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
    """Employee master record."""
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
    SITE_CHOICES = [
        ('libreville', 'Libreville'),
        ('port-gentil', 'Port-Gentil'),
        ('franceville', 'Franceville'),
        ('moanda', 'Moanda'),
        ('site_distant', 'Site Distant (Exploitation)'),
    ]
    SECTOR_CHOICES = [
        ('petrole', 'Pétrole & Mines'),
        ('bois', 'Exploitation Forestière'),
        ('btp', 'BTP & Construction'),
        ('agro', 'Agro-industrie'),
        ('commerce', 'Commerce & Services'),
    ]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='employees')
    user = models.OneToOneField('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='employee')
    employee_id = models.CharField(max_length=20, verbose_name="Matricule")
    cnss_number = models.CharField(max_length=20, blank=True, verbose_name="Numéro CNSS")
    first_name = models.CharField(max_length=100, verbose_name="Prénom")
    last_name = models.CharField(max_length=100, verbose_name="Nom")
    email = models.EmailField(verbose_name="Email")
    phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True)
    date_of_birth = models.DateField(null=True, blank=True, verbose_name="Date de naissance")
    address = models.TextField(blank=True, verbose_name="Adresse")
    nationality = models.CharField(max_length=50, blank=True, verbose_name="Nationalité")
    is_expat = models.BooleanField(default=False, verbose_name="Expatrié")

    # Professional info
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, related_name='employees')
    position = models.ForeignKey(Position, on_delete=models.SET_NULL, null=True, related_name='employees')
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees', verbose_name="Site/Lieu")
    site_location = models.CharField(max_length=50, choices=SITE_CHOICES, default='libreville', verbose_name="Site (Obsolète)")
    sector = models.CharField(max_length=50, choices=SECTOR_CHOICES, default='commerce', verbose_name="Secteur")
    manager = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates')
    contract_type = models.CharField(max_length=20, choices=CONTRACT_CHOICES, default='cdi')
    hire_date = models.DateField(verbose_name="Date d'embauche")
    end_date = models.DateField(null=True, blank=True, verbose_name="Date de fin")
    salary = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Salaire brut")
    family_parts = models.DecimalField(max_digits=3, decimal_places=1, default=1.0, verbose_name="Parts IRPP")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    # Emergency contact
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
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['organization', 'department']),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.employee_id})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def seniority_years(self):
        """Calculate seniority in years."""
        from django.utils import timezone
        from dateutil.relativedelta import relativedelta
        delta = relativedelta(timezone.now().date(), self.hire_date)
        return delta.years
