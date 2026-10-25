"""Entry point.

Development:  python wsgi.py
Production:   waitress-serve --listen=127.0.0.1:5000 --call wsgi:create_app
"""

from app import create_app

app = create_app()

if __name__ == "__main__":
    # Bind to localhost only; debug mode follows FLASK_ENV via config.
    app.run(host="127.0.0.1", port=5000)
