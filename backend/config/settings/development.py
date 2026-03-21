"""Konggest — Development Settings"""
from .base import *

DEBUG = True
ALLOWED_HOSTS = ['*']

# Relax some security for local dev
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False
SECURE_SSL_REDIRECT = False
