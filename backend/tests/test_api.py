import pytest

from app import create_app
from app.extensions import limiter

ORIGIN = "http://localhost:5173"
HEADERS = {"X-Requested-With": "XMLHttpRequest", "Origin": ORIGIN}
VALID = {
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "subject": "Let's build an agent",
    "message": "Hi! I'd love to talk about an automation project.",
}


@pytest.fixture
def client():
    app = create_app("testing")
    app.config["ALLOWED_ORIGINS"] = [ORIGIN]
    limiter.reset()
    return app.test_client()


def test_health_and_headers(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"
    assert "default-src 'none'" in r.headers["Content-Security-Policy"]


def test_profile(client):
    r = client.get("/api/profile")
    assert r.status_code == 200
    assert r.get_json()["projects"]


def test_contact_ok(client):
    r = client.post("/api/contact", json=VALID, headers=HEADERS)
    assert r.status_code == 202


def test_contact_requires_custom_header(client):
    r = client.post("/api/contact", json=VALID, headers={"Origin": ORIGIN})
    assert r.status_code == 415


def test_contact_rejects_form_encoding(client):
    r = client.post("/api/contact", data=VALID, headers=HEADERS)
    assert r.status_code == 415


def test_contact_rejects_foreign_origin(client):
    r = client.post("/api/contact", json=VALID, headers={**HEADERS, "Origin": "https://evil.example"})
    assert r.status_code == 403


def test_contact_allows_same_origin(client):
    r = client.post("/api/contact", json=VALID, headers={**HEADERS, "Origin": "http://localhost"})
    assert r.status_code == 202


def test_contact_validation(client):
    r = client.post("/api/contact", json={**VALID, "email": "nope"}, headers=HEADERS)
    assert r.status_code == 422
    assert "email" in r.get_json()["fields"]


def test_contact_rejects_unknown_fields(client):
    r = client.post("/api/contact", json={**VALID, "admin": True}, headers=HEADERS)
    assert r.status_code == 422


def test_header_injection_is_neutralised():
    from app.validators import validate_contact

    msg = validate_contact({**VALID, "subject": "Hi\r\nBcc: victim@example.com"})
    assert "\n" not in msg.subject and "\r" not in msg.subject


def test_honeypot_silently_accepts(client):
    r = client.post("/api/contact", json={**VALID, "website": "spam.biz"}, headers=HEADERS)
    assert r.status_code == 202


def test_oversized_body_rejected(client):
    r = client.post("/api/contact", json={**VALID, "message": "x" * 20000}, headers=HEADERS)
    assert r.status_code == 413


def test_rate_limited(client):
    codes = [client.post("/api/contact", json=VALID, headers=HEADERS).status_code for _ in range(4)]
    assert 429 in codes
