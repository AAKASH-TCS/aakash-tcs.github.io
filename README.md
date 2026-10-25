# Aakash T C S · AI Visionary Portfolio

A personal brand site and résumé for an AI developer who builds automations. It uses a React (Vite) frontend with glass tiles and motion design, and a Flask API with a hardened contact form.

```
backend/                Flask API (and production web server for the built site)
  app/__init__.py       app factory, CORS, rate limiter, error handlers, static site serving
  app/routes.py         /api/health, /api/profile, /api/contact
  app/validators.py     strict allow-list validation for the contact form
  app/mailer.py         SMTP over TLS, plain-text email, visitor address only in Reply-To
  app/security.py       CSP, HSTS, nosniff, frame-deny and other headers
  app/data/profile.json ← ALL SITE CONTENT LIVES HERE
  tests/test_api.py     API and security tests
frontend/               React 19 + Vite + Framer Motion
  src/components/       Hero, About (bento + live automation console), Skills, Projects,
                        Achievements (scroll timeline), Contact, Navbar, GlassCard…
  src/styles/global.css design tokens (dark/light), glass system, responsive layout
```

## Make it yours

Edit **`backend/app/data/profile.json`**: name, roles, tagline, stats, skills, experience, projects, achievements, socials and résumé URL. Links (`repo`, `demo`, `socials`, `resumeUrl`, `image`) must be full `https://` URLs or paths to this site's own files (e.g. `/Aakash-TCS-Resume.pdf`). Anything else is ignored by design, and empty links are hidden.

**Projects** have a `type`: `"enterprise"` (client work; set `client` and `builtAt`) or `"personal"`. Each one's `image` points to a file in `frontend/public/projects/`. The current images are architecture illustrations; to use a screenshot, drop a PNG/JPG/SVG there (16:9 works best), update `image` and `imageAlt`, and rebuild.

## Run locally

**Backend** (terminal 1):

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env          # macOS/Linux: cp .env.example .env
python wsgi.py                  # http://127.0.0.1:5000
```

**Frontend** (terminal 2):

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173 (proxies /api to Flask)
```

**Tests:** `cd backend && python -m pytest -q`

## Email delivery

With `MAIL_DRY_RUN=true` and no SMTP settings, messages are accepted and only logged (metadata, no personal data). To deliver real email, fill in `SMTP_*`, `CONTACT_RECIPIENT` and `CONTACT_SENDER` in `backend/.env`. For Gmail, enable 2FA and create an **App Password**. Never use your account password.

## GitHub Pages (live site)

Every push to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml): backend tests, `npm audit`, then a **static** build (`VITE_STATIC=true`) published to GitHub Pages. In the static build:

- content comes from `profile.json`, generated at build time from `backend/app/data/profile.json`, so you still edit one file;
- there's no backend, so the Contact section shows **Email me** and **LinkedIn** buttons instead of the form;
- security headers can't be set on Pages, so the strict CSP ships as a `<meta>` tag (everything except `frame-ancestors`).

To try the static build locally: `VITE_STATIC=true npm run build` in `frontend`, then serve `frontend/dist`.

## Production (Flask, with the contact form)

```bash
cd frontend && npm run build    # outputs frontend/dist
cd ../backend
set FLASK_ENV=production
waitress-serve --listen=127.0.0.1:5000 --call wsgi:create_app
```

Flask serves the built site and the API from **one origin**, so production needs no CORS. Put it behind a TLS-terminating reverse proxy (nginx, Caddy, Render, Railway…), set `TRUST_PROXY=true`, a strong `SECRET_KEY`, and `RATELIMIT_STORAGE_URI=redis://…` if you run more than one worker.

## Security measures

| Area | What's done |
|---|---|
| Input | Allow-listed fields only, per-field length limits, Unicode normalisation, control characters stripped, CR/LF removed from single-line fields (blocks email header injection), RFC email validation, 16 KB body cap |
| CSRF | Cookie-less API; contact requires `application/json` + `X-Requested-With` (forces CORS preflight) and an explicit Origin check |
| Abuse | Rate limiting (5/hour and 2/minute per IP on contact), hidden honeypot field, uniform responses that don't reveal bot detection |
| Email | Sent from your own address with the visitor only in `Reply-To` (no spoofing), plain text only, TLS (STARTTLS/SMTPS), 15 s timeout |
| Headers | Strict CSP (no inline scripts, no third-party origins; fonts self-hosted), HSTS, `nosniff`, `X-Frame-Options: DENY` + `frame-ancestors 'none'`, Referrer-Policy, Permissions-Policy, COOP/CORP |
| Frontend | No `dangerouslySetInnerHTML`; API links pass an `https:`-only URL filter; external links use `rel="noopener noreferrer"`; requests sent with `credentials: 'omit'` and a timeout |
| Ops | Secrets only in `.env` (git-ignored), JSON error responses with no stack traces, logs exclude message content, server binds to localhost |

## Design notes

The design follows current portfolio patterns: dark-first theme with a light toggle; **bento grids** (kept to 6–9 tiles, collapsing to one column on phones); **glassmorphism** with pointer-following spotlights and gradient edges, used for depth rather than decoration, with contrast checked; animated aurora background; typewriter roles; magnetic CTAs; 3D-tilt project cards with animated filtering; scroll-driven achievement timeline; animated counters; tech marquee; a live "automation run" console that demonstrates the brand. All motion respects `prefers-reduced-motion`.
