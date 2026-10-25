"""Sends contact form messages over SMTP with TLS."""

import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, make_msgid

from flask import current_app

from .validators import ContactMessage

log = logging.getLogger(__name__)


class MailError(Exception):
    pass


def _smtp_configured(cfg) -> bool:
    return all(
        cfg.get(k)
        for k in ("SMTP_HOST", "SMTP_USERNAME", "SMTP_PASSWORD", "CONTACT_RECIPIENT", "CONTACT_SENDER")
    )


def send_contact_email(msg: ContactMessage) -> None:
    cfg = current_app.config

    if not _smtp_configured(cfg):
        if cfg["MAIL_DRY_RUN"]:
            # Log metadata only; the message body may contain personal data.
            log.info("MAIL_DRY_RUN: contact message received (subject length=%d)", len(msg.subject))
            return
        raise MailError("SMTP is not configured")

    email = EmailMessage()
    # The visitor's address goes in Reply-To, never From, so SPF/DKIM stay valid
    # and the site can't be used to spoof senders.
    email["From"] = formataddr(("Portfolio Contact", cfg["CONTACT_SENDER"]))
    email["To"] = cfg["CONTACT_RECIPIENT"]
    email["Reply-To"] = formataddr((msg.name, msg.email))
    email["Subject"] = f"[Portfolio] {msg.subject}"
    email["Message-ID"] = make_msgid()
    # Plain text only: nothing the visitor typed is ever rendered as HTML.
    email.set_content(f"From: {msg.name} <{msg.email}>\n\n{msg.message}\n")

    context = ssl.create_default_context()
    try:
        port = cfg["SMTP_PORT"]
        if port == 465:
            with smtplib.SMTP_SSL(cfg["SMTP_HOST"], port, context=context, timeout=15) as s:
                s.login(cfg["SMTP_USERNAME"], cfg["SMTP_PASSWORD"])
                s.send_message(email)
        else:
            with smtplib.SMTP(cfg["SMTP_HOST"], port, timeout=15) as s:
                s.starttls(context=context)
                s.login(cfg["SMTP_USERNAME"], cfg["SMTP_PASSWORD"])
                s.send_message(email)
    except (smtplib.SMTPException, OSError) as exc:
        log.error("SMTP send failed: %s", type(exc).__name__)
        raise MailError("send failed") from exc
