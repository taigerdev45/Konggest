"""
Konggest — Input Validators & Sanitization
Prevents injection attacks and ensures data integrity.
"""
import re
import bleach
from rest_framework import serializers


ALLOWED_TAGS = []  # No HTML allowed in API inputs
ALLOWED_ATTRIBUTES = {}


def sanitize_string(value: str) -> str:
    """Remove any HTML/script content from a string."""
    if not isinstance(value, str):
        return value
    return bleach.clean(value, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRIBUTES, strip=True)


def validate_no_sql_injection(value: str) -> str:
    """Check for common SQL injection patterns."""
    sql_patterns = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC)\b)",
        r"(--|;|\/\*|\*\/)",
        r"(\bOR\b\s+\b\d+\b\s*=\s*\b\d+\b)",
    ]
    for pattern in sql_patterns:
        if re.search(pattern, value, re.IGNORECASE):
            raise serializers.ValidationError("Caractères non autorisés détectés.")
    return value


def validate_phone(value: str) -> str:
    """Validate phone number format."""
    cleaned = re.sub(r'[\s\-\.\(\)]', '', value)
    if not re.match(r'^\+?[0-9]{8,15}$', cleaned):
        raise serializers.ValidationError("Numéro de téléphone invalide.")
    return value


def validate_email_strict(value: str) -> str:
    """Strict email validation."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, value):
        raise serializers.ValidationError("Adresse email invalide.")
    return value


class SanitizedCharField(serializers.CharField):
    """CharField that auto-sanitizes input."""
    def to_internal_value(self, data):
        data = super().to_internal_value(data)
        data = sanitize_string(data)
        data = validate_no_sql_injection(data)
        return data
