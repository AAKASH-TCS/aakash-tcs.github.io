"""Strict allow-list validation for the contact form payload."""

import re
import unicodedata
from dataclasses import dataclass

from email_validator import EmailNotValidError, validate_email

LIMITS = {"name": (2, 80), "email": (5, 254), "subject": (3, 120), "message": (10, 4000)}
ALLOWED_FIELDS = set(LIMITS) | {"website"}  # "website" is the honeypot

# Control characters other than newline/tab are never legitimate in a form field.
_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_LINEBREAK = re.compile(r"[\r\n]+")


@dataclass(frozen=True)
class ContactMessage:
    name: str
    email: str
    subject: str
    message: str


class ValidationError(Exception):
    def __init__(self, errors: dict[str, str]):
        super().__init__("invalid payload")
        self.errors = errors


def _clean(value: str, single_line: bool) -> str:
    value = unicodedata.normalize("NFKC", value)
    value = _CONTROL.sub("", value)
    if single_line:
        # Prevents email header injection via CR/LF in name/subject.
        value = _LINEBREAK.sub(" ", value)
    return value.strip()


def validate_contact(payload: object) -> ContactMessage:
    if not isinstance(payload, dict):
        raise ValidationError({"_": "Expected a JSON object."})

    unknown = set(payload) - ALLOWED_FIELDS
    if unknown:
        raise ValidationError({"_": "Unexpected fields."})

    errors: dict[str, str] = {}
    cleaned: dict[str, str] = {}
    for field, (lo, hi) in LIMITS.items():
        raw = payload.get(field)
        if not isinstance(raw, str):
            errors[field] = "Required."
            continue
        value = _clean(raw, single_line=field != "message")
        if not lo <= len(value) <= hi:
            errors[field] = f"Must be between {lo} and {hi} characters."
            continue
        cleaned[field] = value

    if "email" in cleaned:
        try:
            # check_deliverability=False keeps validation offline and fast.
            cleaned["email"] = validate_email(
                cleaned["email"], check_deliverability=False
            ).normalized
        except EmailNotValidError:
            errors["email"] = "Enter a valid email address."

    if errors:
        raise ValidationError(errors)
    return ContactMessage(**cleaned)


def is_bot(payload: dict) -> bool:
    """Honeypot: real users never see or fill the hidden 'website' field."""
    return bool(str(payload.get("website", "")).strip())
