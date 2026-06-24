"""
Konggest — Employees Serializers
Version corrigée et optimisée (2026-04-11)

Corrections :
  - FIX T2 : salary RETIRÉ de EmployeeListSerializer (fuite données sensibles)
  - FIX T2 : salary exposé uniquement dans EmployeeDetailSerializer, conditionnel au rôle
  - FIX Q2 : fichier dédupliqué (une seule version propre)
  - FIX P1 : employee_count via annotation prefetchée (pas de requête N+1)
  - Ajout : SalaryAwareEmployeeDetailSerializer avec contrôle RBAC inline
  - Ajout : ArchivedEmployeeSerializer enrichi
"""
from rest_framework import serializers
from .models import Employee, Department, Position, Location, ArchivedEmployee


class DepartmentSerializer(serializers.ModelSerializer):
    """
    Sérialiseur Département.
    FIX P1 : employee_count utilise une annotation prefetchée via get_queryset().annotate()
    plutôt qu'une requête SQL supplémentaire par objet.
    """
    # Annotation injectée par la View via annotate(employee_count=Count('employees'))
    employee_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Department
        fields = [
            'id', 'name', 'description', 'manager', 'parent',
            'is_active', 'employee_count', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PositionSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(
        source='department.name', read_only=True, default=''
    )

    class Meta:
        model = Position
        fields = ['id', 'title', 'description', 'department', 'department_name', 'is_active']


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ['id', 'name', 'address', 'city', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class EmployeeListSerializer(serializers.ModelSerializer):
    """
    Sérialiseur allégé pour la liste des employés.
    FIX T2 : salary EXCLU — ne jamais exposer les données salariales en liste publique.
    Utilisé par EmployeeViewSet.list (GET /employees/).
    """
    department_name = serializers.CharField(
        source='department.name', read_only=True, default=''
    )
    position_title = serializers.CharField(
        source='position.title', read_only=True, default=''
    )
    location_name = serializers.CharField(
        source='location.name', read_only=True, default=''
    )

    class Meta:
        model = Employee
        fields = [
            'id',
            'employee_id',
            'cnss_number',
            'first_name',
            'last_name',
            'email',
            'phone',
            'gender',
            'department',
            'department_name',
            'position',
            'position_title',
            'location',
            'location_name',
            'contract_type',
            'is_expat',
            'status',
            'hire_date',
            'photo',
            # NOTE : salary intentionnellement ABSENT ici (sécurité T2)
        ]


class EmployeeDetailSerializer(serializers.ModelSerializer):
    """
    Sérialiseur complet pour la fiche employé (vue détail).
    Contient salary et family_parts — accès réservé via RBAC dans la View.
    Utilisé par EmployeeViewSet.retrieve et EmployeeViewSet.me.
    """
    department_name = serializers.CharField(
        source='department.name', read_only=True, default=''
    )
    position_title = serializers.CharField(
        source='position.title', read_only=True, default=''
    )
    location_name = serializers.CharField(
        source='location.name', read_only=True, default=''
    )
    manager_name = serializers.SerializerMethodField()
    seniority_years = serializers.IntegerField(read_only=True)
    position_text = serializers.CharField(
        write_only=True, required=False, allow_blank=True,
        help_text="Intitulé libre du poste — crée ou réutilise une Position existante."
    )
    # Accepte n'importe quel texte libre (pas limité aux SECTOR_CHOICES du modèle)
    sector = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = Employee
        fields = '__all__'
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']

    def get_manager_name(self, obj):
        return obj.manager.full_name if obj.manager else None

    def _resolve_position(self, validated_data):
        """Convertit position_text → Position FK (get_or_create par titre + org)."""
        position_text = validated_data.pop('position_text', None)
        if not position_text:
            return
        request = self.context.get('request')
        org_id = getattr(request, 'tenant_id', None) if request else None
        if not org_id and request:
            try:
                org_id = request.user.profile.organization_id
            except Exception:
                pass
        if not org_id:
            return
        position, _ = Position.objects.get_or_create(
            title__iexact=position_text,
            organization_id=org_id,
            defaults={'title': position_text, 'is_active': True},
        )
        validated_data['position'] = position

    def create(self, validated_data):
        self._resolve_position(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        self._resolve_position(validated_data)
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        """
        FIX T2 : Masque salary/family_parts pour les rôles non autorisés.
        Un manager qui accède à /employees/{id}/ ne voit pas le salaire.
        Seuls hr et admin ont accès aux données salariales.
        """
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and hasattr(request.user, 'profile'):
            role = request.user.profile.role
            if role not in ('admin', 'hr'):
                data.pop('salary', None)
                data.pop('family_parts', None)
        return data


class ArchivedEmployeeSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les employés archivés (lecture seule)."""

    class Meta:
        model = ArchivedEmployee
        fields = [
            'id', 'full_name', 'email', 'phone', 'position', 'department',
            'seniority', 'hire_date', 'contract_type', 'cnss_number',
            'deleted_at', 'deleted_by'
        ]
        read_only_fields = fields
