"""Konggest — Accounts Services (Business Logic)"""
import os
import json
import random
import string
import requests
from django.conf import settings
from django.contrib.auth.models import User
from .models import Organization, UserProfile, SaaSAdmin


class SaaSProvisioningService:
    """Service to handle tenant and user provisioning (Supabase + Django)."""

    @staticmethod
    def create_platform_staff(email, full_name, role_slug):
        """
        Creates a platform-level staff member (SaaS Admin, Support, etc.).
        Returns (user, temp_password, sb_uuid)
        """
        temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
        
        # 1. Prepare Supabase Admin Call
        url = f"{settings.SUPABASE_URL}/auth/v1/admin/users"
        headers = {
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
        }
        
        payload = {
            "email": email,
            "password": temp_password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": full_name,
                "is_platform_admin": True,
                "role": role_slug
            }
        }
        
        # 2. Call Supabase
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        if response.status_code not in [200, 201]:
            raise Exception(f"Supabase Error: {response.text}")
            
        sb_data = response.json()
        sb_uuid = sb_data.get('id')
        
        # 3. Create Local Django User
        first = full_name.split(' ')[0]
        last = ' '.join(full_name.split(' ')[1:]) if ' ' in full_name else ''
        
        user, created = User.objects.get_or_create(
            username=email,
            defaults={
                'email': email,
                'first_name': first,
                'last_name': last
            }
        )
        if created:
            user.set_password(temp_password)
            user.save()
            
        # 4. Create Profiles
        UserProfile.objects.get_or_create(
            user=user,
            defaults={'role': role_slug}
        )
        
        SaaSAdmin.objects.get_or_create(
            user=user,
            defaults={
                'supabase_id': sb_uuid,
                'is_super_admin': (role_slug == 'admin')
            }
        )
        
        return user, temp_password, sb_uuid

    @staticmethod
    def provision_organization(org_name, admin_email, admin_name, password):
        """Provisions a new tenant and its first admin."""
        from django.utils.text import slugify
        
        # 1. Create Org
        org = Organization.objects.create(
            name=org_name,
            slug=slugify(org_name),
            plan='starter',
            max_employees=10,
            activated_modules={
                'employees': True,
                'leaves': True,
                'notifications': True
            }
        )
        
        # 2. Create User
        first = admin_name.split(' ')[0]
        last = ' '.join(admin_name.split(' ')[1:]) if ' ' in admin_name else ''
        
        user = User.objects.create_user(
            username=admin_email,
            email=admin_email,
            password=password,
            first_name=first,
            last_name=last
        )
        
        # 3. Create Profile
        UserProfile.objects.create(
            user=user, 
            organization=org, 
            role='admin'
        )
        
        return org, user


class BillingService:
    """Service to handle financial calculations and invoice generation."""
    
    PLAN_PRICES = {
        'starter': 25000,   # FCFA/mois
        'pro': 75000,       # FCFA/mois
        'premium': 200000,  # FCFA/mois
    }

    @staticmethod
    def calculate_mrr():
        """Returns the Monthly Recurring Revenue from active orgs."""
        total = 0
        orgs = Organization.objects.filter(is_active=True, subscription_status='active')
        for org in orgs:
            total += BillingService.PLAN_PRICES.get(org.plan, 0)
        return total
