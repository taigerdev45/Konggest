"""
Konggest — Employees Views
Version corrigée et optimisée (2026-04-11)

Corrections appliquées (référence analyse 2026-04-11) :
  T1  — perform_update : fallback tenant_id ajouté (identique à perform_create)
  T2  — salary masqué via serializer.to_representation() (RBAC inline)
  T3  — Suppression Supabase Auth déplacée en tâche ASYNCHRONE via threading
         (Celery non installé : utilise threading.Thread pour non-bloquant,
          compatible Render 1 web + 1 worker sans dépendance supplémentaire)
  T4  — stats() utilise location__name (FK actif) et non site_location (obsolète)
  T5  — serializers.py dédupliqué (corrigé dans le fichier serializers)
  T6  — Pagination activée (StandardPagination) sur EmployeeViewSet
  T7  — N+1 employee_count corrigé : annotate() dans DepartmentViewSet.get_queryset()
  T8  — @cache_response activé sur list et stats
  T9  — export_csv utilise StreamingHttpResponse (pas d'OOM sur 1000+ employés)
  T10 — DepartmentViewSet enregistré dans urls.py (cf. urls.py corrigé)
  T11 — Filtres API côté backend (location, is_expat, contract_type) ajoutés
  T16 — Notif Realtime Supabase après create/delete (broadcast asynchrone)
  T17 — site_location supprimé du modèle (migration 0006 — cf. models.py)

Architecture : Django monolithe optimisé | Render 1 web + 1 worker | Redis Upstash Niveau 2
"""
import csv
import threading
import logging

from django.http import StreamingHttpResponse
from django.db import models

from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import IsHRManager, IsManager, IsSameTenant
from core.cache import cache_response, invalidate_cache
from core.pagination import StandardPagination

from .models import Employee, Department, Position, Location, ArchivedEmployee
from .serializers import (
    EmployeeListSerializer,
    EmployeeDetailSerializer,
    DepartmentSerializer,
    PositionSerializer,
    LocationSerializer,
    ArchivedEmployeeSerializer,
)
from apps.accounts.utils import log_action

logger = logging.getLogger('konggest.employees')


# ─────────────────────────────────────────────────────────
# Helper interne — Suppression Supabase Auth asynchrone
# FIX T3 : opération réseau non bloquante via threading.Thread
# ─────────────────────────────────────────────────────────

def _create_supabase_user(email: str, password: str, full_name: str) -> bool:
    """
    Crée un utilisateur dans Supabase Auth via l'Admin API.
    email_confirm: true → pas d'email de confirmation requis.
    Retourne True si succès, False sinon (non fatal).
    """
    import urllib.request
    import json
    from django.conf import settings as s

    supabase_url = getattr(s, 'SUPABASE_URL', '')
    service_key = getattr(s, 'SUPABASE_SERVICE_ROLE_KEY', '')

    if not (supabase_url and service_key):
        logger.warning("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant — user Supabase non créé.")
        return False

    body = json.dumps({
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {"full_name": full_name, "role": "employee"},
    }).encode('utf-8')

    req = urllib.request.Request(
        f"{supabase_url}/auth/v1/admin/users",
        data=body,
        headers={
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
            "Content-Type": "application/json",
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            ok = resp.status in (200, 201)
            if ok:
                logger.info(f"User Supabase créé pour {email}")
            return ok
    except Exception as e:
        logger.warning(f"Création Supabase Auth échouée ({email}): {e}")
        return False


def _delete_supabase_user_async(email: str, settings) -> None:
    """
    Supprime un utilisateur de Supabase Auth en arrière-plan.
    Exécuté dans un thread séparé pour ne pas bloquer la réponse HTTP.
    En cas d'échec, l'erreur est loggée (non fatale).
    """
    def _task():
        import urllib.request
        import json
        supabase_url = getattr(settings, 'SUPABASE_URL', '')
        service_key = getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', '')

        if not (supabase_url and service_key):
            logger.warning("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY non configuré.")
            return

        headers = {
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
            "Content-Type": "application/json",
        }
        try:
            # Étape 1 : retrouver l'user_id Supabase par email
            req = urllib.request.Request(
                f"{supabase_url}/auth/v1/admin/users?email={email}",
                headers=headers,
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                users = data.get('users', []) if isinstance(data, dict) else data

            if not users:
                logger.info(f"Aucun user Supabase trouvé pour {email}.")
                return

            user_id = users[0].get('id')
            if not user_id:
                return

            # Étape 2 : supprimer l'utilisateur
            del_req = urllib.request.Request(
                f"{supabase_url}/auth/v1/admin/users/{user_id}",
                method='DELETE',
                headers=headers,
            )
            urllib.request.urlopen(del_req, timeout=8)
            logger.info(f"User Supabase {email} supprimé avec succès.")

        except Exception as e:
            logger.error(f"Erreur suppression Supabase Auth ({email}): {e}")

    thread = threading.Thread(target=_task, daemon=True)
    thread.start()


# ────────────────────────────────────────────────────────
# T16 : Notification Realtime Supabase après create/delete
# Broadcast non-bloquant sur le channel du tenant concerné.
# ────────────────────────────────────────────────────────

def _broadcast_realtime_async(tenant_id: str, event: str, payload: dict) -> None:
    """
    Envoie un événement Realtime sur le channel `employees:{tenant_id}` via
    l'API REST Supabase Realtime (pas de WebSocket côté serveur).
    Exécuté dans un thread démon — non bloquant.

    Payload exemple :
      { event: 'employee.created', employee_id: 42, full_name: 'Alice Mbou' }

    Côté frontend : supabase.channel('employees:{tenant_id}')
                        .on('broadcast', { event }, callback)
                        .subscribe()
    """
    def _task():
        import urllib.request
        import json
        from django.conf import settings as s

        url = getattr(s, 'SUPABASE_URL', '')
        key = getattr(s, 'SUPABASE_SERVICE_ROLE_KEY', '')
        if not (url and key):
            logger.warning("T16: SUPABASE_URL ou SERVICE_ROLE_KEY manquant — broadcast ignoré.")
            return

        endpoint = f"{url}/realtime/v1/api/broadcast"
        body = json.dumps({
            "messages": [{
                "topic": f"employees:{tenant_id}",
                "event": event,
                "payload": payload,
            }]
        }).encode('utf-8')

        req = urllib.request.Request(
            endpoint,
            data=body,
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            method='POST',
        )
        try:
            urllib.request.urlopen(req, timeout=4)
            logger.info(f"T16: Realtime broadcast '{event}' envoyé sur employees:{tenant_id}")
        except Exception as e:
            logger.warning(f"T16: Realtime broadcast échec ({event}): {e}")

    threading.Thread(target=_task, daemon=True).start()


# ─────────────────────────────────────────────────────────
# Helper — CSV streaming row generator
# FIX T9 : StreamingHttpResponse évite de charger tous les employés en RAM
# ─────────────────────────────────────────────────────────

class EchoBuffer:
    """Pseudo-buffer pour StreamingHttpResponse + csv.writer."""
    def write(self, value):
        return value


def _employee_csv_rows(queryset):
    """Générateur de lignes CSV pour StreamingHttpResponse."""
    buffer = EchoBuffer()
    writer = csv.writer(buffer)

    # En-têtes
    yield writer.writerow([
        'ID', 'Matricule', 'Prénom', 'Nom', 'Email', 'Téléphone',
        'Département', 'Poste', 'Site', 'Contrat',
        'Statut', 'Expatrié', 'CNSS', 'Date Embauche', 'Ancienneté (ans)',
    ])

    for emp in queryset.iterator(chunk_size=200):
        yield writer.writerow([
            emp.id,
            emp.employee_id,
            emp.first_name,
            emp.last_name,
            emp.email,
            emp.phone,
            emp.department.name if emp.department else '',
            emp.position.title if emp.position else '',
            emp.location.name if emp.location else '',
            emp.contract_type,
            emp.status,
            'Oui' if emp.is_expat else 'Non',
            emp.cnss_number,
            emp.hire_date,
            emp.seniority_years,
        ])


# ─────────────────────────────────────────────────────────
# ViewSet principal — Employés
# ─────────────────────────────────────────────────────────

class EmployeeViewSet(viewsets.ModelViewSet):
    """
    CRUD complet pour les employés (scoped par tenant).
    Pagination activée : 25 par page, max 100.
    Cache Redis activé sur list et stats.
    """
    permission_classes = [IsManager, IsSameTenant]
    pagination_class = StandardPagination  # FIX T6

    # FIX T11 : filtres backend (plus de filtre côté JS uniquement)
    filterset_fields = ['department', 'status', 'contract_type', 'location', 'is_expat']
    search_fields = ['first_name', 'last_name', 'employee_id', 'email', 'cnss_number']
    ordering_fields = ['last_name', 'first_name', 'hire_date', 'department', 'status']
    ordering = ['last_name', 'first_name']

    def get_serializer_class(self):
        if self.action == 'list':
            return EmployeeListSerializer
        return EmployeeDetailSerializer

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = Employee.objects.select_related(
            'department', 'position', 'manager', 'location'
        )
        if tenant_id:
            qs = qs.filter(organization_id=tenant_id)
        return qs

    # ── Cache activé sur list ── FIX T8
    @cache_response(timeout=300, key_prefix='employees_list')
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        # Résolution robuste du tenant_id (FIX T1 étendu à create)
        tenant_id = self._resolve_tenant_id()
        emp = serializer.save(organization_id=tenant_id)
        invalidate_cache(tenant_id, 'employees')
        invalidate_cache(tenant_id, 'employees_list')

        # Auto-création du compte Django User + Supabase Auth pour l'employé
        self._generated_password = None
        if emp.email:
            try:
                import secrets
                import string
                from django.contrib.auth.models import User as DjangoUser
                from apps.accounts.models import UserProfile
                if not DjangoUser.objects.filter(username=emp.email).exists():
                    alphabet = string.ascii_letters + string.digits
                    pw = ''.join(secrets.choice(alphabet) for _ in range(10))
                    # 1. Django User (pour auth Django + JWT)
                    user = DjangoUser.objects.create_user(
                        username=emp.email,
                        email=emp.email,
                        password=pw,
                        first_name=emp.first_name,
                        last_name=emp.last_name,
                    )
                    UserProfile.objects.create(
                        user=user,
                        organization_id=tenant_id,
                        role='employee',
                    )
                    emp.user = user
                    emp.save(update_fields=['user'])
                    # 2. Supabase Auth (pour signInWithPassword côté frontend)
                    _create_supabase_user(
                        email=emp.email,
                        password=pw,
                        full_name=emp.full_name,
                    )
                    self._generated_password = pw
                    logger.info(f"Compte utilisateur créé pour l'employé {emp.email}")
            except Exception as e:
                logger.warning(f"Création compte employé échouée ({emp.email}): {e}")

        # T16 : Notifier le frontend via Supabase Realtime
        _broadcast_realtime_async(
            str(tenant_id), 'employee.created',
            {'employee_id': emp.id, 'full_name': emp.full_name, 'status': emp.status}
        )

        try:
            log_action(
                self.request.user, emp.organization, 'create',
                'employee', emp.id, {'full_name': emp.full_name}
            )
        except Exception as e:
            logger.warning(f"Audit log create employee failed: {e}")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self._generated_password = None
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        response_data = dict(serializer.data)
        if self._generated_password:
            response_data['_generated_password'] = self._generated_password
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_update(self, serializer):
        """
        FIX T1 : fallback tenant_id identique à perform_create.
        Avant : self.request.tenant_id pouvait être None → AttributeError 500.
        """
        emp = serializer.save()
        tenant_id = self._resolve_tenant_id()
        invalidate_cache(tenant_id, 'employees')
        invalidate_cache(tenant_id, 'employees_list')

        try:
            log_action(
                self.request.user,
                emp.organization,
                'update',
                'employee',
                emp.id,
                {'full_name': emp.full_name}
            )
        except Exception as e:
            logger.warning(f"Audit log update employee failed: {e}")

    def perform_destroy(self, instance):
        """
        Suppression sécurisée avec archivage et cleanup Supabase asynchrone.
        FIX T3 : appel Supabase Auth dans un thread séparé (non bloquant).
        """
        from django.conf import settings as django_settings

        emp_id = instance.id
        emp_name = instance.full_name
        org = instance.organization
        tenant_id = self._resolve_tenant_id()

        # --- Archiver avant suppression ---
        ArchivedEmployee.objects.create(
            organization=org,
            full_name=emp_name,
            email=instance.email,
            phone=instance.phone,
            position=instance.position.title if instance.position else '',
            department=instance.department.name if instance.department else '',
            seniority=f"{instance.seniority_years} ans",
            hire_date=instance.hire_date,
            contract_type=instance.contract_type,
            cnss_number=instance.cnss_number,
            deleted_by=self.request.user.email,
        )

        # Sauvegarder les infos avant delete cascade
        user_email = instance.user.email if instance.user else None
        django_user = instance.user

        # --- Suppression Django ---
        instance.delete()

        # --- Suppression Django User local ---
        if django_user:
            try:
                django_user.delete()
            except Exception as e:
                logger.warning(f"Erreur suppression Django user: {e}")

        # FIX T3 : Suppression Supabase Auth en arrière-plan (non bloquant)
        if user_email:
            _delete_supabase_user_async(user_email, django_settings)

        # T16 : Notifier le frontend via Supabase Realtime
        _broadcast_realtime_async(
            str(tenant_id), 'employee.deleted',
            {'employee_id': emp_id, 'full_name': emp_name}
        )

        # --- Cache & Audit ---
        invalidate_cache(tenant_id, 'employees')
        invalidate_cache(tenant_id, 'employees_list')

        try:
            log_action(
                self.request.user, org, 'delete',
                'employee', emp_id, {'full_name': emp_name}
            )
        except Exception as e:
            logger.warning(f"Audit log delete employee failed: {e}")

    # ── Profil de l'utilisateur connecté ──
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Retourne le profil employé de l'utilisateur connecté."""
        try:
            employee = Employee.objects.select_related(
                'department', 'position', 'location', 'manager'
            ).get(user=request.user)
            serializer = EmployeeDetailSerializer(employee, context={'request': request})
            return Response(serializer.data)
        except Employee.DoesNotExist:
            return Response(None, status=status.HTTP_200_OK)

    # ── Statistiques dashboard ── FIX T4 + FIX T8
    @action(detail=False, methods=['get'])
    @cache_response(timeout=600, key_prefix='employees_stats')
    def stats(self, request):
        """
        Statistiques RH pour le dashboard avec contexte gabonais.
        FIX T4 : utilise location__name (FK actif) et non site_location (obsolète).
        Cache 10 minutes.
        """
        qs = self.get_queryset()
        total = qs.count()
        terminated = qs.filter(status='terminated').count()
        turnover = round((terminated / total * 100), 2) if total > 0 else 0

        return Response({
            'total': total,
            'active': qs.filter(status='active').count(),
            'on_leave': qs.filter(status='on_leave').count(),
            'suspended': qs.filter(status='suspended').count(),
            'terminated': terminated,
            'turnover_rate': turnover,
            'expat_ratio': round(
                (qs.filter(is_expat=True).count() / total * 100), 1
            ) if total > 0 else 0,
            'by_department': list(
                qs.filter(status='active')
                .values('department__name')
                .annotate(count=models.Count('id'))
                .order_by('-count')[:10]
            ),
            # FIX T4 : location FK actif (remplace site_location obsolète)
            'by_location': list(
                qs.filter(location__isnull=False)
                .values('location__name')
                .annotate(count=models.Count('id'))
                .order_by('-count')
            ),
            'by_sector': list(
                qs.values('sector')
                .annotate(count=models.Count('id'))
                .order_by('-count')
            ),
            'by_contract': list(
                qs.values('contract_type')
                .annotate(count=models.Count('id'))
                .order_by('-count')
            ),
        })

    # ── Export CSV streaming ── FIX T9
    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """
        Export CSV des employés avec StreamingHttpResponse.
        FIX T9 : charge les données par chunks de 200 → pas d'OOM sur 1000+ employés.
        Accessible uniquement aux rôles hr et admin.
        """
        if not hasattr(request.user, 'profile') or request.user.profile.role not in ('admin', 'hr'):
            return Response(
                {'error': 'Accès refusé. Réservé aux rôles HR et Admin.'},
                status=status.HTTP_403_FORBIDDEN
            )

        qs = self.get_queryset().select_related('department', 'position', 'location')

        response = StreamingHttpResponse(
            _employee_csv_rows(qs),
            content_type='text/csv; charset=utf-8',
        )
        response['Content-Disposition'] = 'attachment; filename="employes_export.csv"'
        return response

    # ── Import CSV ── M1 (base implémentée)
    @action(detail=False, methods=['post'])
    def import_csv(self, request):
        """
        Import CSV/Excel des employés.
        Implémentation de base : valide les champs requis et insère en lot.
        """
        if not hasattr(request.user, 'profile') or request.user.profile.role not in ('admin', 'hr'):
            return Response(
                {'error': 'Accès refusé. Réservé aux rôles HR et Admin.'},
                status=status.HTTP_403_FORBIDDEN
            )

        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response({'error': 'Aucun fichier fourni.'}, status=status.HTTP_400_BAD_REQUEST)

        if not csv_file.name.endswith('.csv'):
            return Response(
                {'error': 'Format non supporté. Utilisez un fichier CSV.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        tenant_id = self._resolve_tenant_id()
        created_count = 0
        errors = []

        import io
        decoded = csv_file.read().decode('utf-8-sig')  # utf-8-sig gère le BOM Excel
        reader = csv.DictReader(io.StringIO(decoded))
        required_fields = {'employee_id', 'first_name', 'last_name', 'email', 'hire_date'}

        for i, row in enumerate(reader, start=2):  # ligne 2 = première donnée
            missing = required_fields - set(row.keys())
            if missing:
                errors.append(f"Ligne {i}: colonnes manquantes {missing}")
                continue

            if Employee.objects.filter(
                organization_id=tenant_id, employee_id=row.get('employee_id', '').strip()
            ).exists():
                errors.append(f"Ligne {i}: matricule '{row['employee_id']}' déjà existant.")
                continue

            try:
                Employee.objects.create(
                    organization_id=tenant_id,
                    employee_id=row.get('employee_id', '').strip(),
                    first_name=row.get('first_name', '').strip(),
                    last_name=row.get('last_name', '').strip(),
                    email=row.get('email', '').strip().lower(),
                    phone=row.get('phone', '').strip(),
                    hire_date=row.get('hire_date', '').strip(),
                    contract_type=row.get('contract_type', 'cdi').strip().lower(),
                    status='active',
                )
                created_count += 1
            except Exception as e:
                errors.append(f"Ligne {i}: {e}")

        invalidate_cache(tenant_id, 'employees')
        invalidate_cache(tenant_id, 'employees_list')

        return Response({
            'created': created_count,
            'errors': errors,
            'total_errors': len(errors),
        }, status=status.HTTP_207_MULTI_STATUS if errors else status.HTTP_201_CREATED)

    # ── Helper interne ──
    def _resolve_tenant_id(self):
        """
        Résolution robuste du tenant_id.
        Ordre : middleware → profil → erreur explicite.
        Utilisé dans perform_create, perform_update, perform_destroy.
        """
        tenant_id = getattr(self.request, 'tenant_id', None)
        if not tenant_id:
            try:
                tenant_id = self.request.user.profile.organization_id
            except Exception:
                pass
        if not tenant_id:
            raise serializers.ValidationError(
                {"error": "Organisation non identifiée. Reconnectez-vous."}
            )
        return tenant_id


# ─────────────────────────────────────────────────────────
# ViewSet Départements
# FIX T7 : annotate employee_count (N+1 éliminé)
# ─────────────────────────────────────────────────────────

class DepartmentViewSet(viewsets.ModelViewSet):
    """CRUD pour les départements — réservé aux RH et Admin."""
    serializer_class = DepartmentSerializer
    permission_classes = [IsHRManager]
    filterset_fields = ['is_active']
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        # FIX T7 : annotate = 1 seule requête SQL avec COUNT joint
        qs = Department.objects.annotate(
            employee_count=models.Count(
                'employees', filter=models.Q(employees__status='active')
            )
        )
        if tenant_id:
            qs = qs.filter(organization_id=tenant_id)
        return qs.order_by('name')

    def perform_create(self, serializer):
        tenant_id = self._resolve_tenant_id()
        dept = serializer.save(organization_id=tenant_id)
        try:
            log_action(
                self.request.user, dept.organization, 'create',
                'department', dept.id, {'name': dept.name}
            )
        except Exception:
            pass

    def perform_update(self, serializer):
        dept = serializer.save()
        try:
            log_action(
                self.request.user, dept.organization, 'update',
                'department', dept.id, {'name': dept.name}
            )
        except Exception:
            pass

    def _resolve_tenant_id(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        if not tenant_id:
            try:
                tenant_id = self.request.user.profile.organization_id
            except Exception:
                pass
        if not tenant_id:
            raise serializers.ValidationError(
                {"error": "Organisation non identifiée."}
            )
        return tenant_id


# ─────────────────────────────────────────────────────────
# ViewSet Postes
# ─────────────────────────────────────────────────────────

class PositionViewSet(viewsets.ModelViewSet):
    """CRUD pour les postes — réservé aux RH et Admin."""
    serializer_class = PositionSerializer
    permission_classes = [IsHRManager]
    filterset_fields = ['is_active', 'department']
    search_fields = ['title']

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        if not tenant_id:
            try:
                tenant_id = self.request.user.profile.organization_id
            except Exception:
                pass
        qs = Position.objects.select_related('department')
        if tenant_id:
            qs = qs.filter(organization_id=tenant_id)
        return qs.order_by('title')

    def perform_create(self, serializer):
        tenant_id = self._resolve_tenant_id()
        serializer.save(organization_id=tenant_id)

    def _resolve_tenant_id(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        if not tenant_id:
            try:
                tenant_id = self.request.user.profile.organization_id
            except Exception:
                pass
        if not tenant_id:
            raise serializers.ValidationError({"error": "Organisation non identifiée."})
        return tenant_id


# ─────────────────────────────────────────────────────────
# ViewSet Lieux / Sites
# ─────────────────────────────────────────────────────────

class LocationViewSet(viewsets.ModelViewSet):
    """CRUD pour les sites géographiques — réservé aux RH et Admin."""
    serializer_class = LocationSerializer
    permission_classes = [IsHRManager]
    filterset_fields = ['is_active', 'city']
    search_fields = ['name', 'city']

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = Location.objects.all()
        if tenant_id:
            qs = qs.filter(organization_id=tenant_id)
        return qs.order_by('name')

    def perform_create(self, serializer):
        tenant_id = self._resolve_tenant_id()
        serializer.save(organization_id=tenant_id)

    def _resolve_tenant_id(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        if not tenant_id:
            try:
                tenant_id = self.request.user.profile.organization_id
            except Exception:
                pass
        if not tenant_id:
            raise serializers.ValidationError({"error": "Organisation non identifiée."})
        return tenant_id


# ─────────────────────────────────────────────────────────
# ViewSet Archives
# ─────────────────────────────────────────────────────────

class ArchiveViewSet(viewsets.ReadOnlyModelViewSet):
    """Employés archivés (lecture seule) — réservé aux RH et Admin."""
    serializer_class = ArchivedEmployeeSerializer
    permission_classes = [IsHRManager]
    filterset_fields = ['department', 'contract_type']
    search_fields = ['full_name', 'email', 'position', 'department', 'cnss_number']
    ordering_fields = ['deleted_at', 'full_name']
    ordering = ['-deleted_at']

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        if not tenant_id:
            try:
                tenant_id = self.request.user.profile.organization_id
            except Exception:
                return ArchivedEmployee.objects.none()
        return ArchivedEmployee.objects.filter(organization_id=tenant_id)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Statistiques des archives (turnover historique)."""
        qs = self.get_queryset()
        return Response({
            'total_archived': qs.count(),
            'by_department': list(
                qs.exclude(department='')
                .values('department')
                .annotate(count=models.Count('id'))
                .order_by('-count')
            ),
            'by_year': list(
                qs.values('deleted_at__year')
                .annotate(count=models.Count('id'))
                .order_by('-deleted_at__year')
            ),
            'by_contract': list(
                qs.exclude(contract_type='')
                .values('contract_type')
                .annotate(count=models.Count('id'))
                .order_by('-count')
            ),
        })
