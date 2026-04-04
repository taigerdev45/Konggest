from .models import AuditLog

def log_action(user, organization, action, resource_type, resource_id, details=None, ip=None, user_agent=None):
    """Utility to record an audit log entry."""
    # Ensure user and organization are provided
    if not user or not user.is_authenticated:
        return
    
    from .models import Organization
    # If organization is missing, try to get it from the user's profile
    if not organization:
        try:
            organization = user.profile.organization
        except Exception:
            pass

    if not organization:
        return

    AuditLog.objects.create(
        user=user,
        organization=organization,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id),
        details=details or {},
        ip_address=ip,
        user_agent=user_agent
    )
