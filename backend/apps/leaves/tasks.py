from celery import shared_task
from django.utils import timezone
from .models import LeaveBalance, LeaveType
import logging

logger = logging.getLogger(__name__)

@shared_task
def allocate_monthly_leaves():
    """
    AT6 - Allocation mensuelle des congés.
    Scanne tous les employés et ajoute les jours autorisés dans LeaveBalance
    (Par défaut sur les congés payés actifs). S'exécute le 1er du mois pour le mois précédent.
    """
    logger.info("Démarrage de l'allocation mensuelle des congés...")
    from apps.employees.models import Employee
    from core import hr_settings
    
    employees = Employee.objects.filter(is_active=True).select_related('organization')
    current_year = timezone.now().year
    
    added_count = 0
    for emp in employees:
        try:
            # Chercher le type de congé payé standard de l'organisation
            leave_type = LeaveType.objects.filter(organization=emp.organization, is_paid=True, is_active=True).first()
            if not leave_type:
                continue
                
            balance, created = LeaveBalance.objects.get_or_create(
                employee=emp,
                leave_type=leave_type,
                year=current_year
            )
            
            # Application de la règle gabonaise : 2 jours par mois (fixé dans hr_settings)
            base_monthly = hr_settings.BASE_LEAVE_DAYS_PER_MONTH
            
            # Ajout bonus si franchissement d'anniversaire pour la prime d'ancienneté
            # Simple approche: +2 jours base. Le recalcul complet est fait par la vue si besoin.
            balance.total_days += base_monthly
            balance.save()
            added_count += 1
            
        except Exception as e:
            logger.error(f"Erreur allocation congé pour {emp.id}: {e}")
            
    logger.info(f"Allocation terminée: {added_count} soldes mis à jour.")
    return added_count
