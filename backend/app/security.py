"""HTTP security headers applied to every response."""

from flask import Flask, Response, request

# The API only returns JSON, so it can use the strictest possible CSP.
API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"

# The built React site: self-hosted scripts, styles and fonts only.
SITE_CSP = (
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
    "font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; "
    "form-action 'self'; frame-ancestors 'none'"
)


def register_security_headers(app: Flask) -> None:
    @app.after_request
    def _set_headers(resp: Response) -> Response:
        h = resp.headers
        h["Content-Security-Policy"] = API_CSP if request.path.startswith("/api/") else SITE_CSP
        h["X-Content-Type-Options"] = "nosniff"
        h["X-Frame-Options"] = "DENY"
        h["Referrer-Policy"] = "strict-origin-when-cross-origin"
        h["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), interest-cohort=()"
        h["Cross-Origin-Opener-Policy"] = "same-origin"
        h["Cross-Origin-Resource-Policy"] = "same-site"
        if not app.debug:
            h["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        # Don't advertise the server stack.
        h.pop("Server", None)
        if resp.mimetype == "application/json" and "Cache-Control" not in h:
            h["Cache-Control"] = "no-store"
        return resp
