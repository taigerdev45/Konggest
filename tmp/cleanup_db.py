import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

def cleanup():
    with connection.cursor() as cursor:
        try:
            cursor.execute('DROP TABLE IF EXISTS accounts_saasadmin CASCADE;')
            print("Table accounts_saasadmin dropped locally.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    cleanup()
