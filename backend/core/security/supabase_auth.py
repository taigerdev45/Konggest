"""Konggest — Supabase JWT Authentication for DRF"""
import jwt
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework import authentication
from rest_framework import exceptions
from apps.accounts.models import UserProfile, Organization

class SupabaseJWTAuthentication(authentication.BaseAuthentication):
    """
    Validates Supabase JWTs sent in the Authorization header.
    Requires SUPABASE_JWT_SECRET in settings (which matches the one in Supabase dashboard).
    """
    keyword = 'Bearer'

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith(f'{self.keyword} '):
            return None

        token = auth_header.split(' ')[1]

        try:
            # Supabase uses HS256 for signing their JWTs. 
            # We must verify the signature using the SUPABASE_JWT_SECRET.
            secret = getattr(settings, 'SUPABASE_JWT_SECRET', '')
            if not secret:
                # If secret is missing, fallback to anon key for validation logic
                secret = getattr(settings, 'SUPABASE_ANON_KEY', '')

            payload = jwt.decode(
                token, 
                secret, 
                algorithms=["HS256"], 
                audience="authenticated"
            )
        except (jwt.ExpiredSignatureError, jwt.DecodeError, Exception):
            # If it's not a valid Supabase token, we return None to let other
            # authentication classes (like JWTAuthentication) try to authenticate.
            return None

        user_id = payload.get('sub')
        email = payload.get('email')

        if not user_id or not email:
            raise exceptions.AuthenticationFailed('Payload JWT invalide (sub/email manquant).')

        # Find or create a user stub for Django's request.user
        # Note: In a fully decentralized BaaS, the user might not even exist in auth_user.
        # But for DRF compatibility, we map it.
        try:
            user = User.objects.get(username=email)
        except User.DoesNotExist:
            user = User(username=email, email=email)
            user.is_authenticated = True
            user.id = user_id # Using Supabase UUID temporarily (not saved to DB)

        return (user, token)

    def authenticate_header(self, request):
        return self.keyword
