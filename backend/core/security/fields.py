"""Konggest — Encrypted Django Model Fields"""
from django.db import models
from .encryption import encrypt_value, decrypt_value

class EncryptedCharField(models.CharField):
    """
    Transparently encrypts string values on save and decrypts on read.
    Uses AES-256-GCM.
    Note: Searching (filtering) on this field via the ORM will not work directly 
    as the ciphertext includes a random nonce every time.
    """
    def __init__(self, *args, **kwargs):
        kwargs.setdefault('max_length', 255) # Leave room for base64 nonce + ciphertext
        super().__init__(*args, **kwargs)

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if value:
            return encrypt_value(str(value))
        return value

    def from_db_value(self, value, expression, connection):
        if value:
            try:
                return decrypt_value(value)
            except Exception:
                # In case data wasn't encrypted yet, or decryption fails.
                return value
        return value

    def to_python(self, value):
        if isinstance(value, str):
            try:
                return decrypt_value(value)
            except Exception:
                pass
        return super().to_python(value)
