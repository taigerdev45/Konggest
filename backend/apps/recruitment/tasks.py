import os
import uuid
import logging
from celery import shared_task
from django.conf import settings
from supabase import create_client, Client
from apps.recruitment.models import Application

logger = logging.getLogger(__name__)

def get_supabase_client() -> Client:
    supabase_url = getattr(settings, 'SUPABASE_URL', '')
    supabase_key = getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', '')
    if not supabase_url or not supabase_key:
        raise ValueError("Supabase credentials missing.")
    return create_client(supabase_url, supabase_key)

@shared_task
def process_and_upload_resume(application_id, file_path, original_filename, content_type):
    """
    R5: Pipeline asynchrone Celery pour l'upload des CV.
    Libère le web worker Render et envoie le CV sur Supabase.
    """
    try:
        application = Application.objects.get(id=application_id)
        
        # Upload vers Supabase Storage "resumes"
        supabase = get_supabase_client()
        tenant_id = str(application.job.organization_id)
        object_name = f"{tenant_id}/{application.id}_{uuid.uuid4().hex[:8]}_{original_filename}"
        
        with open(file_path, 'rb') as f:
            file_encoded = f.read()
            
        supabase.storage.from_("resumes").upload(
            path=object_name,
            file=file_encoded,
            file_options={"content-type": content_type}
        )
        
        application.resume_url = object_name
        application.save()
        
        logger.info(f"CV de la candidature {application_id} uplaodé avec succès: {object_name}")

    except Exception as e:
        logger.error(f"Celery Exception dans l'upload du CV {application_id}: {e}")
    finally:
        # Nettoyage système
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass

@shared_task
def send_application_confirmation(application_id):
    """
    R9: Worker Celery pour envoyer e-mail auto de confirmation au candidat.
    """
    try:
        from django.core.mail import send_mail
        application = Application.objects.get(id=application_id)
        
        subject = f"Votre candidature pour le poste de {application.job.title}"
        message = f"Bonjour {application.first_name},\n\nNous avons bien reçu votre candidature pour le poste de {application.job.title} chez {application.job.organization.name}. Nous vous remercions pour l'intérêt que vous portez à notre entreprise.\n\nNotre équipe RH étudie actuellement votre profil et vous fera un retour dans les meilleurs délais.\n\nCordialement,\nL'équipe Recrutement"
        
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@konggest.com')
        recipient_list = [application.email]
        
        # Assuming you have SMTP configured, otherwise this might just log in dev
        send_mail(subject, message, from_email, recipient_list, fail_silently=True)
        logger.info(f"Email de confirmation envoyé à {application.email}")
    except Exception as e:
        logger.error(f"Erreur envoi email candidature {application_id}: {e}")
