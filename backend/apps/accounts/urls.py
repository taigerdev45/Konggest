"""Konggest — Accounts URLs"""
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, LoginView, ProfileView, AuditLogViewSet, 
    StaffDashboardView, OrganizationViewSet, UserProfileViewSet, 
    UserPlatformViewSet, PlatformStaffViewSet, InvoiceViewSet
)

router = DefaultRouter()
router.register('audit-logs', AuditLogViewSet, basename='audit-logs')
router.register('user-profiles', UserProfileViewSet, basename='user-profiles')
router.register('organizations', OrganizationViewSet, basename='organizations')
router.register('platform-users', UserPlatformViewSet, basename='platform-users')
router.register('platform-staff', PlatformStaffViewSet, basename='platform-staff')
router.register('invoices', InvoiceViewSet, basename='invoices')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('profile/', ProfileView.as_view(), name='auth-profile'),
    path('staff-stats/', StaffDashboardView.as_view(), name='staff-stats'),
    path('public-partners/', PublicPartnerView.as_view(), name='public-partners'),
    path('', include(router.urls)),
]
