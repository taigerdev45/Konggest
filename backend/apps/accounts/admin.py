from django.contrib import admin
from .models import Organization, UserProfile, AuditLog, LoginAttempt

admin.site.register(Organization)
admin.site.register(UserProfile)
admin.site.register(AuditLog)
admin.site.register(LoginAttempt)
