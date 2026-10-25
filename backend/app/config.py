import os
import secrets


def _bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


class Config:
    ENV = os.getenv("FLASK_ENV", "production")
    DEBUG = False
    TESTING = False

    # A random key per process is safer than a hard-coded fallback.
    SECRET_KEY = os.getenv("SECRET_KEY") or secrets.token_hex(32)

    # Reject request bodies larger than 16 KB; the contact form never needs more.
    MAX_CONTENT_LENGTH = 16 * 1024

    JSON_SORT_KEYS = False

    ALLOWED_ORIGINS = [
        o.strip()
        for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
        if o.strip()
    ]

    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_DEFAULT = "120 per minute"
    CONTACT_RATE_LIMIT = os.getenv("CONTACT_RATE_LIMIT", "5 per hour; 2 per minute")

    SMTP_HOST = os.getenv("SMTP_HOST", "")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    CONTACT_RECIPIENT = os.getenv("CONTACT_RECIPIENT", "")
    CONTACT_SENDER = os.getenv("CONTACT_SENDER", "") or SMTP_USERNAME
    MAIL_DRY_RUN = _bool("MAIL_DRY_RUN", True)


class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    TESTING = True
    RATELIMIT_ENABLED = True
    MAIL_DRY_RUN = True


CONFIGS = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": Config,
}
