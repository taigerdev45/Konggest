"""
Konggest — Core Middleware
- TenantMiddleware: Multi-tenant isolation
- SecurityHeadersMiddleware: Additional security headers
- AuditMiddleware: Request audit logging
"""
import logging
import json
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse

logger = logging.getLogger('konggest.audit')


class TenantMiddleware(MiddlewareMixin):
    """Extract tenant (organization) from JWT and inject into request."""

    EXEMPT_PATHS = ['/api/health/', '/api/auth/', '/admin/']

    def process_request(self, request):
        request.tenant_id = None

        if any(request.path.startswith(p) for p in self.EXEMPT_PATHS):
            return None

        if hasattr(request, 'user') and request.user.is_authenticated:
            try:
                # First try to get it from the user profile
                if hasattr(request.user, 'profile') and request.user.profile.organization_id:
                    request.tenant_id = request.user.profile.organization_id
                # Fallback if profile exists but organization is none (e.g. support user)
            except Exception as e:
                logger.error(f"Error extracting tenant_id: {e}")

        return None


class SecurityHeadersMiddleware(MiddlewareMixin):
    """Add additional security headers to all responses."""

    def process_response(self, request, response):
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Cache-Control'] = 'no-store, no-cache, must-revalidate, private'
        response['Pragma'] = 'no-cache'
        return response


class AuditMiddleware(MiddlewareMixin):
    """Log all API requests for audit trail."""

    AUDIT_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

    def process_response(self, request, response):
        if request.method in self.AUDIT_METHODS and request.path.startswith('/api/'):
            user = getattr(request, 'user', None)
            username = user.username if user and user.is_authenticated else 'anonymous'

            logger.info(json.dumps({
                'user': username,
                'method': request.method,
                'path': request.path,
                'status': response.status_code,
                'ip': self._get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            }))

        return response

    @staticmethod
    def _get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')
