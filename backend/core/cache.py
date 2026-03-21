"""
Konggest — Cache Helpers
Redis caching utilities with tenant-aware key management.
"""
from functools import wraps
from django.core.cache import cache


def cache_key(tenant_id, resource, identifier=None):
    """Generate a tenant-scoped cache key."""
    key = f"konggest:tenant:{tenant_id}:{resource}"
    if identifier:
        key += f":{identifier}"
    return key


def cache_response(timeout=900, key_prefix='view'):
    """Decorator to cache API view responses."""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            tenant_id = getattr(request, 'tenant_id', 'global')
            ck = cache_key(tenant_id, key_prefix, request.get_full_path())

            cached = cache.get(ck)
            if cached is not None:
                return cached

            response = view_func(self, request, *args, **kwargs)

            if response.status_code == 200:
                cache.set(ck, response, timeout)

            return response
        return wrapper
    return decorator


def invalidate_cache(tenant_id, resource):
    """Invalidate all cache keys for a tenant resource."""
    pattern = cache_key(tenant_id, resource, '*')
    # django-redis supports key pattern deletion
    try:
        from django_redis import get_redis_connection
        conn = get_redis_connection('default')
        keys = conn.keys(f"*{cache_key(tenant_id, resource)}*")
        if keys:
            conn.delete(*keys)
    except Exception:
        pass


def invalidate_tenant_cache(tenant_id):
    """Invalidate ALL cache for a tenant."""
    try:
        from django_redis import get_redis_connection
        conn = get_redis_connection('default')
        keys = conn.keys(f"*konggest:tenant:{tenant_id}:*")
        if keys:
            conn.delete(*keys)
    except Exception:
        pass
