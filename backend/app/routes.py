import json
import logging
from functools import lru_cache
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request

from .extensions import limiter
from .mailer import MailError, send_contact_email
from .validators import ValidationError, is_bot, validate_contact

log = logging.getLogger(__name__)
api = Blueprint("api", __name__, url_prefix="/api")

PROFILE_PATH = Path(__file__).parent / "data" / "profile.json"


@lru_cache(maxsize=1)
def _load_profile() -> dict:
    with PROFILE_PATH.open(encoding="utf-8") as f:
        return json.load(f)


@api.get("/health")
def health():
    return jsonify(status="ok")


@api.get("/profile")
def profile():
    resp = jsonify(_load_profile())
    # Public, non-personalised content: safe to cache briefly.
    resp.headers["Cache-Control"] = "public, max-age=300"
    return resp


def _origin_allowed() -> bool:
    origin = request.headers.get("Origin")
    # Some same-origin requests omit Origin; a cross-site browser request never does.
    if origin is None:
        return True
    same_origin = origin == request.host_url.rstrip("/")
    return same_origin or origin in current_app.config["ALLOWED_ORIGINS"]


@api.post("/contact")
@limiter.limit(lambda: current_app.config["CONTACT_RATE_LIMIT"])
def contact():
    # CSRF defence for a cookie-less JSON API: require a JSON content type and a
    # custom header (both force a CORS preflight) and check Origin explicitly.
    if not request.is_json or request.headers.get("X-Requested-With") != "XMLHttpRequest":
        return jsonify(error="Unsupported request."), 415
    if not _origin_allowed():
        return jsonify(error="Origin not allowed."), 403

    payload = request.get_json(silent=True)
    if isinstance(payload, dict) and is_bot(payload):
        # Pretend success so bots don't learn about the honeypot.
        return jsonify(ok=True), 202

    try:
        msg = validate_contact(payload)
    except ValidationError as exc:
        return jsonify(error="Please fix the highlighted fields.", fields=exc.errors), 422

    try:
        send_contact_email(msg)
    except MailError:
        return jsonify(error="Message could not be sent right now. Please try again later."), 503

    return jsonify(ok=True), 202
