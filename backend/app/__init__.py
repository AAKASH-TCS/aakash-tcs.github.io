import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, abort, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from werkzeug.middleware.proxy_fix import ProxyFix

load_dotenv()

from .config import CONFIGS  # noqa: E402  (needs env loaded first)
from .extensions import limiter  # noqa: E402
from .routes import api  # noqa: E402
from .security import register_security_headers  # noqa: E402


def create_app(env: str | None = None) -> Flask:
    env = env or os.getenv("FLASK_ENV", "production")
    app = Flask(__name__)
    app.config.from_object(CONFIGS.get(env, CONFIGS["production"]))

    if os.getenv("TRUST_PROXY", "").lower() in {"1", "true", "yes"}:
        # Behind one reverse proxy (nginx, Render, etc.): trust its X-Forwarded-* headers
        # so client IPs (rate limiting) and https scheme (Origin check) are correct.
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    # CORS: explicit allow-list, only the API routes, only the methods/headers we use.
    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["ALLOWED_ORIGINS"]}},
        methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "X-Requested-With"],
        supports_credentials=False,
        max_age=600,
    )

    limiter.init_app(app)
    register_security_headers(app)
    app.register_blueprint(api)
    _register_frontend(app)

    @app.errorhandler(HTTPException)
    def _http_error(exc: HTTPException):
        # Uniform JSON errors; never leak stack traces or internals.
        return jsonify(error=exc.description if exc.code and exc.code < 500 else "Server error."), exc.code

    @app.errorhandler(Exception)
    def _unhandled(exc: Exception):
        app.logger.exception("Unhandled error")
        return jsonify(error="Server error."), 500

    return app


def _register_frontend(app: Flask) -> None:
    """Serve the built React app (frontend/dist) so production is a single origin."""
    dist = Path(os.getenv("FRONTEND_DIST", Path(__file__).resolve().parents[2] / "frontend" / "dist"))
    if not (dist / "index.html").is_file():
        return

    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    @limiter.exempt
    def _site(path: str):
        if path.startswith("api/"):
            abort(404)
        # send_from_directory rejects path traversal outside `dist`.
        if path and (dist / path).is_file():
            resp = send_from_directory(dist, path)
            if path.startswith("assets/"):
                # Vite fingerprints asset names, so they can be cached forever.
                resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
            return resp
        resp = send_from_directory(dist, "index.html")
        resp.headers["Cache-Control"] = "no-cache"
        return resp
