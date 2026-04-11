# Generated manually — 2026-04-11
"""
Migration T17 : Suppression définitive du champ `site_location` sur Employee.

POURQUOI :
  Le champ site_location (CharField) est obsolète depuis la migration vers
  le modèle Location (FK). Il est conservé depuis plusieurs versions pour
  compatibilité, mais constitue une dette technique croissante (Q1).
  
COMMENT :
  - Suppression du champ dans la DB.
  - Les references dans serializers.py (extra_kwargs) et views.py sont
    maintenues au niveau du code pour absorber silencieusement d'eventuelles
    requêtes envoyant encore ce champ.
  - Après cette migration, les tests utilisant site_location ont été mis à jour.

PREREQUIS :
  - Vérifier qu'aucune query Django active n'utilise Employee.site_location
    en filter/annotate (seuls extra_kwargs DRF l'acceptent encore).
  - Exécuter : python manage.py migrate employees 0006_remove_site_location
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0005_optimize_indexes_email_archived'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='employee',
            name='site_location',
        ),
    ]
