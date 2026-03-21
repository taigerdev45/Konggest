"""Konggest — Custom Permissions (RBAC)"""
from rest_framework.permissions import BasePermission


class IsOrganizationAdmin(BasePermission):
    """Only organization admins."""
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.role == 'admin'
        )


class IsHRManager(BasePermission):
    """HR managers and above."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated or not hasattr(request.user, 'profile'):
            return False
        return request.user.profile.role in ('admin', 'hr')


class IsManager(BasePermission):
    """Managers, HR, and admins."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated or not hasattr(request.user, 'profile'):
            return False
        return request.user.profile.role in ('admin', 'hr', 'manager')


class IsEmployee(BasePermission):
    """Any authenticated employee."""
    def has_permission(self, request, view):
        return request.user.is_authenticated


class IsSameTenant(BasePermission):
    """Ensure the user belongs to the same tenant as the resource."""
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated or not hasattr(request.user, 'profile'):
            return False
        obj_org = getattr(obj, 'organization_id', None)
        if obj_org is None and hasattr(obj, 'employee'):
            obj_org = getattr(obj.employee, 'organization_id', None)
        return obj_org == request.user.profile.organization_id
