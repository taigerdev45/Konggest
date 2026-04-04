# backend/apps/accounts/management/commands/sync_supabase.py
import os
import requests
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.conf import settings
from apps.accounts.models import UserProfile, Organization, SaaSAdmin

class Command(BaseCommand):
    help = 'Synchronise les utilisateurs existants de Supabase Auth vers Django auth_user.'

    def handle(self, *args, **options):
        url = getattr(settings, 'SUPABASE_URL', '') + '/auth/v1/admin/users'
        key = getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', '')

        if not url or not key:
            self.stdout.write(self.style.ERROR('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant.'))
            return

        headers = {
            'Authorization': f'Bearer {key}',
            'apikey': key,
            'Content-Type': 'application/json',
        }

        try:
            self.stdout.write('Récupération des utilisateurs de Supabase...')
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            users_data = response.json().get('users', [])
            
            created_count = 0
            updated_count = 0
            
            # Organisation par défaut
            default_org, _ = Organization.objects.get_or_create(
                slug='default',
                defaults={'name': 'Mon Organisation'}
            )

            for sb_user in users_data:
                email = sb_user.get('email')
                uuid = sb_user.get('id')
                metadata = sb_user.get('user_metadata', {})
                full_name = metadata.get('full_name', '')
                
                # Check for existing user
                user_obj, created = User.objects.get_or_create(
                    username=email,
                    defaults={
                        'email': email,
                        'first_name': full_name.split(' ')[0] if ' ' in full_name else full_name,
                        'last_name': ' '.join(full_name.split(' ')[1:]) if ' ' in full_name else '',
                    }
                )
                
                if created:
                    user_obj.set_unusable_password()
                    user_obj.save()
                    created_count += 1
                    self.stdout.write(f'Créé : {email}')
                else:
                    updated_count += 1
                
                # UserProfile
                UserProfile.objects.get_or_create(
                    user=user_obj,
                    defaults={
                        'organization': default_org,
                        'role': metadata.get('role', 'admin')
                    }
                )
                
                # SaaS Admin Sync
                if metadata.get('is_platform_admin') or metadata.get('is_super_admin'):
                    SaaSAdmin.objects.get_or_create(
                        user=user_obj,
                        defaults={
                            'supabase_id': uuid,
                            'is_super_admin': True
                        }
                    )

            self.stdout.write(self.style.SUCCESS(
                f'Synchronisation terminée. Créés: {created_count}, Existants: {updated_count}'
            ))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Erreur : {str(e)}'))
