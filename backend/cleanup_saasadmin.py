import os
import sys
import django
from django.db import connection

# Fix paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

def cleanup():
    with connection.cursor() as cursor:
        cursor.execute("DROP TABLE IF EXISTS accounts_saasadmin CASCADE;")
    print("Table accounts_saasadmin dropped.")

if __name__ == "__main__":
    cleanup()
