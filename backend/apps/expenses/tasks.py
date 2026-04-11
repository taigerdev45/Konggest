import os
import uuid
import tempfile
import logging
from celery import shared_task
from PIL import Image
from django.conf import settings
from supabase import create_client, Client
from apps.expenses.models import Expense

logger = logging.getLogger(__name__)

def get_supabase_client() -> Client:
    supabase_url = getattr(settings, 'SUPABASE_URL', '')
    supabase_key = getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', '')
    if not supabase_url or not supabase_key:
        raise ValueError("Supabase credentials missing.")
    return create_client(supabase_url, supabase_key)

@shared_task
def compress_and_upload_expense_attachment(expense_id, file_path, original_filename, content_type):
    """
    E3: Pipeline asynchrone Celery/Pillow pour les fichiers de dépenses.
    Libère le web worker Render, compresse l'image > 500 Ko et envoie sur Supabase.
    """
    try:
        expense = Expense.objects.get(id=expense_id)
        
        final_file_path = file_path
        
        # Step 1: Compression si c'est une image
        if content_type.startswith('image/'):
            try:
                img = Image.open(file_path)
                # Conversion en RGB si nécessaire (ex: RGBA pour PNG)
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Redimensionnement max 1920x1080 proportionnel
                img.thumbnail((1920, 1080), Image.Resampling.LANCZOS)
                
                # Sauvegarde avec qualité 75
                compressed_file_path = f"{file_path}_compressed.jpg"
                img.save(compressed_file_path, "JPEG", optimize=True, quality=75)
                final_file_path = compressed_file_path
                content_type = 'image/jpeg'
                original_filename = f"{os.path.splitext(original_filename)[0]}.jpg"
            except Exception as e:
                logger.error(f"Erreur de compression Pillow: {e}. Continuation avec fichier brut.")
                
        # Step 2: Upload vers Supabase Storage
        supabase = get_supabase_client()
        tenant_id = str(expense.organization.id)
        object_name = f"{tenant_id}/{expense.id}_{uuid.uuid4().hex[:8]}_{original_filename}"
        
        with open(final_file_path, 'rb') as f:
            file_encoded = f.read()
            
        supabase.storage.from_("expenses").upload(
            path=object_name,
            file=file_encoded,
            file_options={"content-type": content_type}
        )
        
        # Step 3: Obtenir URL publique (Bucket public) ou URL privée signer à la volée. 
        # Pour des raisons de sécu, on stocke le path, la vue se chargera du presigned url.
        expense.attachment_url = object_name
        expense.save()
        
        logger.info(f"Fichier de dépense {expense_id} compressé et uplaodé avec succès: {object_name}")

    except Exception as e:
        logger.error(f"Celery Exception dans l'upload de dépense {expense_id}: {e}")
    finally:
        # Nettoyage système
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
            if 'compressed_file_path' in locals() and os.path.exists(compressed_file_path):
                os.remove(compressed_file_path)
        except Exception:
            pass
            
@shared_task
def clean_rejected_expenses_attachments():
    """
    E6: Nettoyage Cron supprimant les justificatifs des depenses refusées datant de plus de 3 jours.
    """
    from django.utils import timezone
    from datetime import timedelta
    
    three_days_ago = timezone.now() - timedelta(days=3)
    expenses_to_clean = Expense.objects.filter(status='rejected', updated_at__lt=three_days_ago).exclude(attachment_url__isnull=True).exclude(attachment_url='')
    
    cleaned = 0
    if expenses_to_clean.exists():
        try:
            supabase = get_supabase_client()
            for exp in expenses_to_clean:
                # Suppression coté supabase
                supabase.storage.from_("expenses").remove([exp.attachment_url])
                # Reset du champ DB
                exp.attachment_url = ""
                exp.save()
                cleaned += 1
        except Exception as e:
            logger.error(f"Erreur cron clean_rejected_expenses_attachments: {e}")
            
    logger.info(f"Cron Expenses Clean: {cleaned} attachments supprimés.")
    return cleaned
