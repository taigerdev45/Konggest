#!/usr/bin/env bash
# Render Build Script for Konggest Backend
set -o errexit

echo "=== Installing dependencies ==="
pip install -r requirements.txt

echo "=== Collecting static files ==="
python manage.py collectstatic --noinput

echo "=== Generating database migrations ==="
python manage.py makemigrations

echo "=== Running database migrations ==="
python manage.py migrate --noinput

echo "=== Build complete ==="
