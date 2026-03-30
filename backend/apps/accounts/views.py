"""Konggest — Accounts Views"""
from rest_framework import status, generics, viewsets
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from core.permissions import IsManager
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .serializers import RegisterSerializer, LoginSerializer, UserProfileSerializer, AuditLogSerializer, OrganizationSerializer
from django.db.models import Count, Sum
from .models import Organization, UserProfile, AuditLog, LoginAttempt

class StaffDashboardView(APIView):
    """Global metrics for SaaS administrators."""
    permission_classes = [IsAuthenticated] # Should be IsSuperUser in production

    def get(self, request):
        try:
            request.user.saas_admin
            is_saas = True
        except Exception:
            is_saas = False
        if not request.user.is_staff and not is_saas:
            return Response({'error': 'Access denied'}, status=403)

        from apps.employees.models import Employee
        from apps.leaves.models import LeaveRequest
        from apps.documents.models import Document

        stats = {
            'total_organizations': Organization.objects.count(),
            'active_organizations': Organization.objects.filter(is_active=True).count(),
            'total_users': UserProfile.objects.count(),
            'total_employees': Employee.objects.count(),
            'total_leave_requests': LeaveRequest.objects.count(),
            'total_documents': Document.objects.count(),
            'org_distribution': Organization.objects.values('plan').annotate(count=Count('id')),
            'recent_logins': AuditLog.objects.filter(action='login').count(),
            'failed_attempts': LoginAttempt.objects.filter(success=False).count(),
        }
        return Response(stats)


class OrganizationViewSet(viewsets.ModelViewSet):
    """Admin view for managing all organizations."""
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        try:
            self.request.user.saas_admin
            is_saas = True
        except Exception:
            is_saas = False
        if not self.request.user.is_staff and not is_saas:
            return Organization.objects.none()
        return Organization.objects.all()

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        """Get or update current user's organization."""
        org = request.user.profile.organization
        if request.method == 'PATCH':
            serializer = self.get_serializer(org, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        
        serializer = self.get_serializer(org)
        return Response(serializer.data)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """View and list audit logs for current organization."""
    permission_classes = [IsAuthenticated, IsManager]
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = AuditLog.objects.select_related('user').all()
        return qs.filter(organization_id=tenant_id) if tenant_id else qs


class RegisterView(generics.CreateAPIView):
    """Register a new organization + admin user."""
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
    throttle_scope = 'auth'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Organisation créée avec succès.',
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.get_full_name(),
                'role': user.profile.role,
                'organization': user.profile.organization.name,
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """Authenticate user and return JWT tokens."""
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        ip = self._get_client_ip(request)

        user = authenticate(request, username=email, password=password)

        LoginAttempt.objects.create(
            email=email,
            ip_address=ip,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            success=user is not None,
        )

        # Brute force check: block after 5 failed attempts in 15 min
        recent_failures = LoginAttempt.objects.filter(
            ip_address=ip, success=False
        ).order_by('-created_at')[:10]
        if len(recent_failures) >= 5:
            from django.utils import timezone
            from datetime import timedelta
            cutoff = timezone.now() - timedelta(minutes=15)
            recent = [a for a in recent_failures if a.created_at > cutoff]
            if len(recent) >= 5:
                return Response(
                    {'error': 'Trop de tentatives. Réessayez dans 15 minutes.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

        if user is None:
            return Response(
                {'error': 'Email ou mot de passe incorrect.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'error': 'Compte désactivé.'},
                status=status.HTTP_403_FORBIDDEN
            )

        refresh = RefreshToken.for_user(user)

        # SaaS Admin check
        is_saas_admin = hasattr(user, 'saas_admin')
        organization = None
        role = 'saas_admin' if is_saas_admin else None

        if hasattr(user, 'profile') and user.profile.organization:
            organization = user.profile.organization
            if not role:
                role = user.profile.role

        AuditLog.objects.create(
            user=user,
            organization=organization,
            action='login',
            resource_type='auth',
            ip_address=ip,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

        return Response({
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.get_full_name(),
                'role': role,
                'is_saas_admin': is_saas_admin,
                'organization': organization.name if organization else None,
                'organization_id': organization.id if organization else None,
                'redirect_to': '/staff' if is_saas_admin else '/dashboard',
            }
        })

    @staticmethod
    def _get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        return x_forwarded_for.split(',')[0].strip() if x_forwarded_for else request.META.get('REMOTE_ADDR', '')


class ProfileView(generics.RetrieveUpdateAPIView):
    """Get or update current user's profile."""
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get(self, request, *args, **kwargs):
        user = request.user
        from .models import SaaSAdmin, UserProfile
        
        # 1. Reliable SaaS Admin detection
        is_saas = SaaSAdmin.objects.filter(user=user).exists()
        
        # 2. Initial data with guaranteed fields
        data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.get_full_name() or user.email,
            'is_saas_admin': is_saas,
            'redirect_to': '/staff' if is_saas else '/dashboard',
            'role': 'saas_admin' if is_saas else 'admin',
            'organization': None,
            'v': '1.0.2'  # Version tag for cache busting diagnosis
        }
        
        # 3. Safely augment with profile data if available
        try:
            profile = UserProfile.objects.filter(user=user).first()
            if profile:
                serializer = self.get_serializer(profile)
                profile_data = serializer.data
                # Update but keep our guaranteed flags
                data.update(profile_data)
                data['is_saas_admin'] = is_saas
                data['redirect_to'] = '/staff' if is_saas else '/dashboard'
        except Exception as e:
            import logging
            logging.getLogger('django').error(f"Profile augmentation error: {e}")
            
        return Response(data)


class UserProfileViewSet(viewsets.ModelViewSet):
    """Manage users within the current organization (Manager only)."""
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated, IsManager]

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = UserProfile.objects.select_related('user', 'organization').all()
        if tenant_id:
            qs = qs.filter(organization_id=tenant_id)
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return UserInviteSerializer
        return UserProfileSerializer

    def perform_create(self, serializer):
        from django.contrib.auth.models import User
        import random
        import string

        email = serializer.validated_data['email']
        full_name = serializer.validated_data['full_name']
        role = serializer.validated_data['role']
        
        # 1. Create Django User
        first_name = full_name.split(' ')[0]
        last_name = ' '.join(full_name.split(' ')[1:]) if ' ' in full_name else ''
        
        temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
        user = User.objects.create_user(
            username=email,
            email=email,
            password=temp_password,
            first_name=first_name,
            last_name=last_name
        )

        # 2. Create Profile associated with manager organization
        # Note: organization is retrieved from context/tenant middleware
        org_id = getattr(self.request, 'tenant_id', None)
        if not org_id:
            # Fallback for dev/manual creation
            org_id = self.request.user.profile.organization_id

        UserProfile.objects.create(
            user=user,
            organization_id=org_id,
            role=role
        )
        # Note: In a real app, send an invite email with temp_password or Supabase invite here.

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        profile = self.get_object()
        profile.is_active = False
        profile.save()
        return Response({'status': 'Profil suspendu'})

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        profile = self.get_object()
        profile.is_active = True
        profile.save()
        return Response({'status': 'Profil activé'})
