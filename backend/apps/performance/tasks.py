from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from .models import PerformanceReview

@shared_task
def send_performance_feedback(review_id: int, sender_name: str):
    """
    Envoie un email de retour sur l'évaluation terminée à l'employé concerné.
    Le traitement asynchrone permet de fluidifier la requête de création/mise à jour.
    """
    try:
        review = PerformanceReview.objects.get(id=review_id)
        
        # En production, vous utiliserez un service comme SendGrid ou SES.
        # Ici on simule l'envoi via la console (selon le DEFAULT_FROM_EMAIL).
        
        subject = f"Votre évaluation de performance - {review.period}"
        message = (
            f"Bonjour {review.employee.full_name},\n\n"
            f"Votre évaluation pour la période {review.period} a été finalisée par {sender_name}.\n"
            f"Note globale attribuée : {review.overall_rating}/5\n\n"
            f"Connectez-vous à l'espace Konggest pour consulter les détails, vos points forts et axes d'amélioration.\n\n"
            f"Cordialement,\n"
            f"L'équipe Konggest"
        )
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[review.employee.email],
            fail_silently=False,
        )
        return f"Email envoyé avec succès à {review.employee.email}"
        
    except PerformanceReview.DoesNotExist:
        return f"Review {review_id} introuvable."
    except Exception as e:
        return f"Erreur lors de l'envoi : {str(e)}"
