# TrackEats

A nutrition-tracking web app and portfolio project. Three surfaces share one backend:

- **[backend/](backend/)** — Python / Flask / SQLAlchemy, MySQL 8, served by Waitress in prod
- **[frontend/](frontend/)** — React 19 + Vite + MUI 7 + react-router 7 (web app)
- **[mobile/](mobile/)** — Expo ~55 + React Native 0.83 (iOS/Android, same REST API as web)

The backend has no UI — it's REST endpoints only ([backend/src/routes.py](backend/src/routes.py)) and acts as a proxy between the clients and MySQL.

## Local development

Dev environment is **WSL2 Ubuntu 24.04 on Windows**. Each surface has a `bin/run.sh`:

- Backend: `cd backend && source .venv/bin/activate && bin/run.sh` — Flask dev server on `:5000`
- Frontend: `cd frontend && bin/run.sh` — Vite dev server (`npm run dev`)
- Mobile: `cd mobile && bin/run.sh` — `expo start --dev-client --tunnel`. We use EAS for native builds because Android Studio lives on Windows, not WSL. Only rebuild the APK when native deps change; everyday JS/TS changes hot-reload via Metro.

Backend and frontend each have a `.env` (gitignored); see `.env.example` files for what's needed. **Frontend env vars must be prefixed `VITE_`** — Vite only exposes those to the bundle, and the values are public once shipped.

Local DB: run `docker-compose up db` and the MySQL container is enough; no need to run the app itself in containers locally. The `docker-compose.override.yml` exists for full local containerized runs but isn't kept current — assume it may be stale.

## Production deployment

GitHub Actions builds Docker images on push to `main`, pushes to Docker Hub (`lastcallsoftware/trackeats-frontend`, `lastcallsoftware/trackeats-backend`), then SSHes to the app server (`lastcallsw.com`) and runs [deploy.sh](deploy.sh), which `docker compose pull && up`s. Nginx fronts the frontend container and terminates TLS (Let's Encrypt via certbot). See [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

Secrets come from GitHub Secrets in prod and `.env` locally. The `${VAR:?}` syntax in [docker-compose.yml](docker-compose.yml) is the canonical list of what the backend container needs.

## Database

- ORM: Flask-SQLAlchemy. Models in [backend/src/models.py](backend/src/models.py).
- Migrations: Flask-Migrate (Alembic) — versions in [backend/migrations/versions/](backend/migrations/versions/). The `migrate` service in `docker-compose.yml` runs `flask db upgrade` before backend startup.
- App startup splits into `minimal_app_config()` (enough for migrations to run from CLI) and `additional_app_config()` (JWT, crypto, CORS, rate limiting). See [backend/src/app.py](backend/src/app.py).
- Helper scripts in [backend/bin/](backend/bin/) for db init/load/purge/export.

## Auth and crypto

- Passwords hashed with **bcrypt**.
- PII (e.g. email) encrypted with a symmetric key (**pynacl**) — `BACKEND_ENCRYPTION_KEY_B64` env var.
- Sessions via **JWT** (`flask-jwt-extended`), `JWT_SECRET_KEY` from env.
- Social login: Google (web + Android client IDs), Apple, Facebook. See [backend/src/routes.py](backend/src/routes.py) `/api/social_login`.
- Rate limiting via `flask-limiter` on unauthenticated routes (custom decorator near the top of routes.py).
- **CORS is currently fully permissive** (`CORS(app, expose_headers=["Location"])` with no origin allowlist) — there's a TODO in [backend/src/app.py](backend/src/app.py) to tighten this before any real production traffic.

## Conventions and gotchas

- **[docs/design.md](docs/design.md) is explicitly marked outdated** — do not use it as a reference. [docs/setup.md](docs/setup.md) is still useful for first-time environment setup.
- Backend code uses verbose, conversational comments by design (this is a portfolio/learning project). Match that style in backend Python; don't strip them. Frontend/mobile TS code is terser — match what's already there.
- Frontend uses **MUI v7** + Emotion. Forms use **react-hook-form + zod**. State for cross-page data lives in [frontend/src/contexts/DataProvider.tsx](frontend/src/contexts/DataProvider.tsx).
- Mobile uses **expo-router**, **zustand** for state, **@tanstack/react-query** for server state, **yup** (not zod) for validation, **expo-secure-store** for token storage.
- `frontend/lastcallsw/` and `frontend/portfolio/` are sibling static sites bundled into the same Nginx container — not part of the React app itself.
- Tests: backend has [backend/tests/](backend/tests/) split into `unit/` and `integration/` (pytest, `@pytest.mark.integration` for the latter). Mobile uses Jest (`npm test` in [mobile/](mobile/)). Frontend has no test suite yet.

## Useful entry points when starting a task

- New API endpoint → [backend/src/routes.py](backend/src/routes.py), then schema in [backend/src/schemas.py](backend/src/schemas.py), model in [backend/src/models.py](backend/src/models.py), migration via `flask db migrate -m "..."`.
- New web page → [frontend/src/components/](frontend/src/components/), register the route in [frontend/src/components/App.tsx](frontend/src/components/App.tsx).
- New mobile screen → [mobile/src/screens/](mobile/src/screens/), route via expo-router conventions.
- Wiring a new env var → add to `.env.example`, `docker-compose.yml` (`environment:` block, with `:?` if required), and read via `os.environ.get(...)` in backend or `import.meta.env.VITE_...` in frontend.
