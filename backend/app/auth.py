"""Resolves the caller's owner identity for scoping documents.

Two schemes coexist so existing anonymous users keep working:
- Signed-in users send a Firebase ID token as `Authorization: Bearer <token>`.
  It is verified against Google's public keys (no service-account credential
  needed) and the caller's Firebase UID becomes the owner id.
- Anonymous users send an `X-Owner-Id` header with a client-generated UUID,
  trusted as-is (no stronger identity is available for them).

A signed-in caller is always identified by their verified UID, never by a
client-supplied header, so identity can't be spoofed once a user signs in.
"""

import logging

from fastapi import Header
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.config import settings

logger = logging.getLogger(__name__)

_request_adapter = google_requests.Request()


def resolve_owner_id(
    authorization: str | None = Header(None),
    x_owner_id: str | None = Header(None, alias="X-Owner-Id"),
) -> str | None:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        try:
            claims = google_id_token.verify_firebase_token(
                token, _request_adapter, audience=settings.google_cloud_project
            )
        except ValueError:
            logger.warning("Rejected invalid Firebase ID token")
            return None
        if claims:
            return f"firebase:{claims['sub']}"
        return None

    return x_owner_id
