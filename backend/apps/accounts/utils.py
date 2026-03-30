from .models import AuditLog

def log_action(user, organization, action, resource_type, resource_id, details=None, ip=None, user_agent=None):
    """Utility to record an audit log entry."""
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
