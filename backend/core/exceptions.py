"""Konggest — Custom Exception Handler"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger('konggest.errors')


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        response.data['status_code'] = response.status_code
        return response

    from django.conf import settings
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    return Response(
        {'error': 'Une erreur interne est survenue.', 'status_code': 500},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
