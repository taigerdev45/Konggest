"""Konggest — Notifications Universal Utils"""
import threading
from django.conf import settings
from .models import Notification


def send_notification(user, title, message, notification_type='info', link='', send_email=True):
    """
    Unified helper to send a notification.
    1. Saves to Database.
    2. Broadcasts via Supabase Realtime (Async).
    3. Queues Email via Celery (Asynchronous).
    """
    # 1. Save to DB
    notification = Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notification_type,
        link=link
    )

    # 2. Broadcast via Supabase Realtime (Non-blocking)
    # We use a thread to avoid blocking the main request if Supabase is slow
    tenant_id = user.profile.organization_id if hasattr(user, 'profile') else 'global'
    thread = threading.Thread(
        target=_broadcast_realtime,
        args=(user.id, tenant_id, title, message, notification_type)
    )
    thread.daemon = True
    thread.start()

    # 3. Queue Email if requested (Celery)
    if send_email and user.email:
        from .tasks import send_email_task
        send_email_task.delay(
            user_id=user.id,
            subject=title,
            message=message
        )
    
    return notification


def _broadcast_realtime(user_id, tenant_id, title, message, n_type):
    """
    Internal helper to broadcast notification via Supabase API.
    """
    try:
        import requests
        import json
        
        url = f"{settings.SUPABASE_URL}/rest/v1/rpc/broadcast_notification"
        headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "p_channel": f"notifications:{user_id}",
            "p_event": "new_notification",
            "p_payload": {
                "title": title,
                "message": message,
                "type": n_type,
                "tenant_id": tenant_id
            }
        }
        # Note: We use the REST RPC here, or standard broadcast if configured.
        # For now, we assume a broadcast channel pattern.
        requests.post(url, headers=headers, data=json.dumps(payload), timeout=5)
    except Exception as e:
        print(f"Supabase Realtime Broadcast Error: {e}")
