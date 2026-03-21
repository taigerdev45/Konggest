"""Konggest — Production Settings (Full security)"""
from .base import *

DEBUG = False

# Force HTTPS
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 63072000  # 2 years
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Strict cookies
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
