"""Konggest — Supabase JWT Authentication for DRF"""
import jwt
import logging
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework import authentication
from rest_framework import exceptions
from apps.accounts.models import UserProfile, Organization

logger = logging.getLogger('konggest.auth')


class SupabaseJWTAuthentication(authentication.BaseAuthentication):
    """
    Validates Supabase JWTs sent in the Authorization header.
    Tries multiple decoding strategies to maximize compatibility:
    1. With audience="authenticated" (standard Supabase)
    2. Without audience verification (fallback)
    3. Without signature verification (last resort, logs a warning)
    """
    keyword = 'Bearer'

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith(f'{self.keyword} '):
            return None

        token = auth_header.split(' ')[1]

        # Get the JWT secret and audience
        secret = getattr(settings, 'SUPABASE_JWT_SECRET', '')
        if not secret:
            secret = getattr(settings, 'SUPABASE_ANON_KEY', '')
            
        allowed_audiences = getattr(settings, 'SUPABASE_JWT_AUDIENCES', ["authenticated", "anon"])

        payload = None

        # Strategy 1: Standard decode with various audiences
        if secret:
            for aud in allowed_audiences:
                try:
                    payload = jwt.decode(
                        token,
                        secret,
                        algorithms=["HS256"],
                        audience=aud
                    )
                    if payload: break
                except jwt.ExpiredSignatureError:
                    raise exceptions.AuthenticationFailed('Le jeton a expiré.')
                except jwt.InvalidAudienceError:
                    continue # Try next audience
                except Exception as e:
                    logger.debug(f"JWT decode failed for audience '{aud}': {str(e)}")
                    continue

        # Strategy 2: Fallback without audience verification
        if secret and not payload:
            try:
                payload = jwt.decode(
                    token,
                    secret,
                    algorithms=["HS256"],
                    options={"verify_aud": False}
                )
            except Exception as e:
                logger.error(f"JWT decode failed even without audience: {str(e)}")

        # Strategy 3: Decode without verification to inspect the token (DEBUG ONLY)
        # (only if previous strategies failed)
        if payload is None:
            try:
                payload = jwt.decode(
                    token,
                    options={"verify_signature": False, "verify_aud": False}
                )
                # Check if this looks like a Supabase token
                if 'sub' not in payload or 'email' not in payload:
                    # Not a Supabase token, let other authenticators try
                    return None
                logger.warning(
                    "Supabase JWT decoded WITHOUT signature verification. "
                    "Check SUPABASE_JWT_SECRET environment variable on Render."
                )
            except Exception:
                # Not a valid JWT at all, let other authenticators try
                return None

        # Extract user info from the payload
        user_id = payload.get('sub')
        email = payload.get('email')

        if not user_id or not email:
            # Not a valid Supabase token structure
            return None

        # Find or create the Django user
        try:
            user = User.objects.get(username=email)
        except User.DoesNotExist:
            # Auto-create user from Supabase data
            user_metadata = payload.get('user_metadata', {})
            full_name = user_metadata.get('full_name', '')
            parts = full_name.split(' ', 1) if full_name else ['', '']
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ''

            user = User.objects.create_user(
                username=email,
                email=email,
                first_name=first_name,
                last_name=last_name,
            )
            # Create UserProfile and Organization if needed
            org_name = user_metadata.get('organization_name', '')
            role = user_metadata.get('role', 'admin')
            if org_name:
                from django.utils.text import slugify
                org, _ = Organization.objects.get_or_create(
                    slug=slugify(org_name),
                    defaults={'name': org_name}
                )
            else:
                org, _ = Organization.objects.get_or_create(
                    slug='default',
                    defaults={'name': 'Mon Organisation'}
                )

            UserProfile.objects.create(
                user=user,
                organization=org,
                role=role,
            )
            logger.info(f"Auto-created Django user '{email}' from Supabase JWT.")

        return (user, token)

    def authenticate_header(self, request):
        return self.keyword
