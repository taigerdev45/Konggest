"""Konggest — Accounts Views"""
from rest_framework import status, generics, viewsets
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.core.cache import cache
from django.db import models

from core.permissions import IsManager, IsSaaSAdmin
from .models import Organization, UserProfile, AuditLog, LoginAttempt, Invoice
from .serializers import (
    RegisterSerializer, LoginSerializer, UserProfileSerializer, 
    AuditLogSerializer, OrganizationSerializer, StaffInviteSerializer, 
    UserInviteSerializer, InvoiceSerializer
)
from .services import SaaSProvisioningService, BillingService


class StaffDashboardView(APIView):
    """Global metrics for SaaS administrators with Redis Caching."""
    permission_classes = [IsAuthenticated, IsSaaSAdmin]

    def get(self, request):
        cache_key = 'saas_admin_global_stats'
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)

        from apps.employees.models import Employee
        from apps.leaves.models import LeaveRequest
        from apps.documents.models import Document

        stats = {
            'total_organizations': Organization.objects.count(),
            'active_organizations': Organization.objects.filter(subscription_status='active').count(),
            'total_users': UserProfile.objects.count(),
            'total_employees': Employee.objects.count(),
            'total_leave_requests': LeaveRequest.objects.count(),
            'total_documents': Document.objects.count(),
            'mrr': BillingService.calculate_mrr(),
            'org_distribution': list(Organization.objects.values('plan').annotate(count=models.Count('id'))),
            'recent_logins': AuditLog.objects.filter(action='login').count(),
            'failed_attempts': LoginAttempt.objects.filter(success=False).count(),
        }
        
        # Cache for 15 minutes (900 seconds)
        cache.set(cache_key, stats, 900)
        return Response(stats)


class OrganizationViewSet(viewsets.ModelViewSet):
    """Admin view for managing all organizations."""
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        is_saas = hasattr(self.request.user, 'saas_admin')
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


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """Manage invoices for organizations."""
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'saas_admin'):
            return Invoice.objects.all()
        return Invoice.objects.filter(organization=user.profile.organization)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """View and list audit logs for current organization."""
    permission_classes = [IsAuthenticated, IsManager | IsSaaSAdmin]
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        user = self.request.user
        is_saas = hasattr(user, 'saas_admin')
        if is_saas:
            return AuditLog.objects.select_related('user', 'organization').all()
        return AuditLog.objects.filter(organization=user.profile.organization).select_related('user')


class UserProfileViewSet(viewsets.ModelViewSet):
    """Manage users within the current organization (Manager only)."""
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated, IsManager]

    def get_serializer_class(self):
        if getattr(self, 'action', None) == 'create':
            return UserInviteSerializer
        return UserProfileSerializer

    def get_queryset(self):
        return UserProfile.objects.filter(organization=self.request.user.profile.organization).select_related('user')


class UserPlatformViewSet(viewsets.ReadOnlyModelViewSet):
    """Global user list for SaaS administrators."""
    permission_classes = [IsAuthenticated, IsSaaSAdmin]
    serializer_class = UserProfileSerializer
    queryset = UserProfile.objects.select_related('user', 'organization').all()


class RegisterView(generics.CreateAPIView):
    """Register a new organization + admin user."""
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            org, user = SaaSProvisioningService.provision_organization(
                org_name=serializer.validated_data['organization_name'],
                admin_email=serializer.validated_data['email'],
                admin_name=f"{serializer.validated_data['first_name']} {serializer.validated_data['last_name']}",
                password=serializer.validated_data['password']
            )
            refresh = RefreshToken.for_user(user)
            return Response({
                'message': 'Organisation créée avec succès.',
                'tokens': {'access': str(refresh.access_token), 'refresh': str(refresh)},
                'user': {'id': user.id, 'email': user.email, 'role': user.profile.role, 'organization': org.name}
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=400)


class LoginView(APIView):
    """Authenticate user and return JWT tokens."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        ip = self._get_client_ip(request)

        user = authenticate(request, username=email, password=password)

        LoginAttempt.objects.create(
            email=email, ip_address=ip,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            success=user is not None,
        )

        if user is None:
            return Response({'error': 'Email ou mot de passe incorrect.'}, status=401)

        refresh = RefreshToken.for_user(user)
        is_saas_admin = hasattr(user, 'saas_admin')
        
        return Response({
            'tokens': {'access': str(refresh.access_token), 'refresh': str(refresh)},
            'user': {
                'id': user.id, 'email': user.email, 'full_name': user.get_full_name(),
                'role': 'saas_admin' if is_saas_admin else user.profile.role,
                'is_saas_admin': is_saas_admin,
                'organization': user.profile.organization.name if (not is_saas_admin and hasattr(user, 'profile') and user.profile.organization) else None,
                'redirect_to': '/staff' if is_saas_admin else '/dashboard',
            }
        })

    @staticmethod
    def _get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        return x_forwarded_for.split(',')[0].strip() if x_forwarded_for else request.META.get('REMOTE_ADDR', '')


class ProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get(self, request, *args, **kwargs):
        user = request.user
        is_saas = hasattr(user, 'saas_admin')
        data = {
            'id': user.id, 'email': user.email, 'full_name': user.get_full_name(),
            'is_saas_admin': is_saas, 'redirect_to': '/staff' if is_saas else '/dashboard',
        }
        if hasattr(user, 'profile'):
            profile_data = self.get_serializer(user.profile).data
            data.update(profile_data)
        return Response(data)


class PlatformStaffViewSet(viewsets.ModelViewSet):
    """Manage platform-level staff using SaaSProvisioningService."""
    permission_classes = [IsAuthenticated, IsSaaSAdmin]
    serializer_class = UserProfileSerializer

    def get_queryset(self):
        from .models import SaaSAdmin
        saas_ids = SaaSAdmin.objects.values_list('user_id', flat=True)
        return UserProfile.objects.filter(user_id__in=saas_ids).select_related('user')

    @action(detail=False, methods=['post'], serializer_class=StaffInviteSerializer)
    def invite(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user, temp_pass, sb_uuid = SaaSProvisioningService.create_platform_staff(
                email=serializer.validated_data['email'],
                full_name=serializer.validated_data['full_name'],
                role_slug=serializer.validated_data['role']
            )
            return Response({
                "message": "Invitation envoyée.",
                "temp_password": temp_pass, "supabase_uuid": sb_uuid
            }, status=201)
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class PublicPartnerView(APIView):
    """Public list of organizations marked as trusted partners."""
    permission_classes = [AllowAny]

    def get(self, request):
        partners = Organization.objects.filter(is_trusted_partner=True, is_active=True)
        serializer = OrganizationSerializer(partners, many=True)
        return Response(serializer.data)
