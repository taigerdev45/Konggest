"""
Konggest — Data Encryption (AES-256-GCM)
For encrypting sensitive data like salaries, SSN, etc.
"""
import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings


def get_encryption_key():
    """Get the AES-256 encryption key from settings."""
    key_hex = settings.ENCRYPTION_KEY
    return bytes.fromhex(key_hex)


def encrypt_value(plaintext: str) -> str:
    """Encrypt a string value using AES-256-GCM."""
    key = get_encryption_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode('utf-8'), None)
    return base64.b64encode(nonce + ciphertext).decode('utf-8')


def decrypt_value(encrypted: str) -> str:
    """Decrypt an AES-256-GCM encrypted string."""
    key = get_encryption_key()
    aesgcm = AESGCM(key)
    data = base64.b64decode(encrypted)
    nonce = data[:12]
    ciphertext = data[12:]
    return aesgcm.decrypt(nonce, ciphertext, None).decode('utf-8')
