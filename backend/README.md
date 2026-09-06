# Polaris Backend — Authentication & Authorization Microservice

Production-grade, industrial-standard authentication and role-based access control (RBAC) service for the **Polaris Heavy Oil Wellbore Digital Twin & Joint Optimization Platform**.

---

## Architecture & Security Highlights

| Layer | Implementation | Security Safeguards |
|---|---|---|
| **Language & Engine** | Python 3.11+ / FastAPI | High throughput async ASGI, non-blocking I/O |
| **Database** | PostgreSQL + asyncpg + SQLAlchemy 2.0 | Connection pooling, prepared statements (SQL injection immunity) |
| **Migrations** | Alembic | Fully versioned schemas, reproducible across environments |
| **Password Hashing** | **Argon2id** (`argon2-cffi`) | OWASP recommended (memory=64MB, time_cost=3, parallelism=4). Plain text is never stored. |
| **Tokens** | **JWT Access + Cryptographic Refresh** | Short-lived Access Token (15 min); Opaque Refresh Token stored hashed (SHA-256) |
| **Token Rotation** | Automatic single-use refresh token rotation | **Reuse Detection**: Replaying an old refresh token instantly revokes all family sessions |
| **Storage** | Secure HttpOnly Cookie | Refresh tokens stored in `HttpOnly`, `SameSite=Lax`, `Secure` (in prod) cookies to block XSS |
| **Brute Force Protection** | Exponential backoff / Account lockout | 5 failed attempts locks the account for 15 minutes |
| **Timing Attack Defense** | Constant-time dummy verification | Login runs hash check on dummy constant even when user is not found |
| **RBAC Authorization** | FastAPI Dependency Injection | Strict separation between Authentication (`authenticate`) and Authorization (`authorize`) |
| **Audit Logging** | Append-only DB table + Structlog | Structured logs with IP, user-agent, action metadata. No secrets logged. |

---

## Endpoints

### 1. Authentication (`/api/auth`)
* `POST /api/auth/login` — Authenticate using `employee_id` and `password`. Returns JWT access token and sets `HttpOnly` refresh cookie.
* `POST /api/auth/refresh` — Rotates refresh token, invalidates old token, returns new access token.
* `POST /api/auth/logout` — Revokes current active session and clears cookie.
* `POST /api/auth/logout-all` — Revokes all active sessions for current user across devices.
* `GET /api/auth/me` — Returns current authenticated user's profile and permissions.
* `POST /api/auth/change-password` — Change password requiring previous password verification.

### 2. Admin Management (`/api/admin`) *(Restricted to ADMIN role)*
* `POST /api/admin/operators` — Create a new field operator account.
* `GET /api/admin/operators` — Paginated operator search with status filtering.
* `GET /api/admin/operators/{id}` — Get single operator details.
* `PATCH /api/admin/operators/{id}` — Update operator full name or email.
* `PATCH /api/admin/operators/{id}/status` — Activate, suspend, or terminate operator account (revokes active sessions).
* `POST /api/admin/operators/{id}/reset-password` — Force-reset operator password.
* `GET /api/admin/audit-logs` — Paginated inspection of security audit trail.

---

## Quickstart Guide

### 1. Create and Activate Virtual Environment
```powershell
cd backend
python -m venv .venv

# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1

# On Linux/macOS:
source .venv/bin/activate
```

### 2. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 3. Configure Environment
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```
Update `DATABASE_URL` in `.env` with your PostgreSQL database connection string.

### 4. Run Migrations & Bootstrap Admin
```powershell
alembic upgrade head
python scripts/bootstrap_admin.py
```

### 5. Start Development Server
```powershell
python app/server.py
```
* **API Server**: `http://localhost:8000`
* **Interactive OpenAPI (Swagger) Docs**: `http://localhost:8000/api/docs`

---

## Testing

Run unit and integration test suite with `pytest`:
```powershell
pytest -v
```
