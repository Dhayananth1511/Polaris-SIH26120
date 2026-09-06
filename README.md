# POLARIS — Heavy Oil Digital Twin & Optimization Platform

> **Oil India Limited · Baghewala Field Operations**  
> Real-time telemetry, CSS thermal cycle management, SRP diagnostics and AI-driven joint optimization for heavy oil wellbores.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
  - [4. Running the App](#4-running-the-app)
- [Environment Variables](#environment-variables)
- [First-Time Admin Setup](#first-time-admin-setup)
- [Default Login Credentials](#default-login-credentials)
- [Available Scripts](#available-scripts)
- [Contributing](#contributing)

---

## Overview

POLARIS is a full-stack web platform for monitoring and optimizing heavy oil production at Oil India Limited's Baghewala PML field (Jaisalmer District, Rajasthan). It combines:

- 🛰️ **Live satellite field map** (Leaflet + Google Hybrid) with 23 BGW well pins
- 🌡️ **CSS thermal cycle tracking** — steam injection, soak & production phases
- ⚙️ **SRP mechanical diagnostics** — rod load, pump efficiency, dynamometer data
- 🤖 **AI surrogate model recommendations** — XGBoost + Boberg-Lantz residuals
- 👤 **Role-based access** — Field Operator & System Administrator

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4 |
| **Routing** | React Router v7 |
| **State** | Zustand |
| **Map** | Leaflet.js + Google Hybrid tiles |
| **Charts** | Recharts |
| **3D** | React Three Fiber / Three.js |
| **Backend** | FastAPI (Python 3.11+) |
| **Database** | PostgreSQL 15+ (async via asyncpg + SQLAlchemy) |
| **Auth** | JWT (access + refresh tokens), Argon2id password hashing |
| **Migrations** | Alembic |

---

## Project Structure

```
Polaris-SIH26120/
├── frontend/               # React + Vite app
│   ├── src/
│   │   ├── components/     # Reusable UI components (layout, map, ui)
│   │   ├── pages/          # Route-level page components
│   │   ├── store/          # Zustand state stores
│   │   ├── services/       # API client (axios)
│   │   ├── data/           # Mock/static data
│   │   └── types/          # TypeScript types
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                # FastAPI Python app
│   ├── app/
│   │   ├── routes/         # API route handlers (auth, admin)
│   │   ├── services/       # Business logic
│   │   ├── repositories/   # DB query layer
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── core/           # JWT, security, cookies
│   │   ├── middleware/      # Auth, rate-limit, CORS
│   │   └── config/         # App settings (pydantic-settings)
│   ├── alembic/            # DB migrations
│   ├── scripts/            # Bootstrap scripts
│   ├── tests/              # Pytest test suite
│   ├── requirements.txt
│   └── .env.example
│
└── README.md
```

---

## Prerequisites

Make sure the following are installed before you begin:

| Tool | Version | Download |
|---|---|---|
| **Node.js** | 20+ | https://nodejs.org |
| **npm** | 10+ | Comes with Node.js |
| **Python** | 3.11+ | https://python.org |
| **PostgreSQL** | 15+ | https://postgresql.org |
| **Git** | Any | https://git-scm.com |

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Dhayananth1511/Polaris-SIH26120.git
cd Polaris-SIH26120
```

To use a specific branch (e.g. `dhaya`):

```bash
git clone -b dhaya https://github.com/Dhayananth1511/Polaris-SIH26120.git
cd Polaris-SIH26120
```

---

### 2. Backend Setup

#### a) Create a PostgreSQL database

```sql
CREATE USER polaris WITH PASSWORD 'changeme';
CREATE DATABASE polaris_db OWNER polaris;
```

#### b) Create and activate a virtual environment

```bash
cd backend

# Windows
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# macOS / Linux
python -m venv .venv
source .venv/bin/activate
```

#### c) Install Python dependencies

```bash
pip install -r requirements.txt
```

#### d) Set up environment variables

```bash
# Copy the example file
cp .env.example .env
```

Open `.env` and fill in your values (see [Environment Variables](#environment-variables)).

#### e) Run database migrations

```bash
alembic upgrade head
```

#### f) Bootstrap the first admin user *(one-time only)*

```bash
python scripts/bootstrap_admin.py
```

> ⚠️ After running this once, clear `BOOTSTRAP_ADMIN_PASSWORD` from your `.env` file.

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

---

### 4. Running the App

Open **two terminals**:

**Terminal 1 — Backend API**
```bash
cd backend
.\.venv\Scripts\Activate.ps1   # Windows
# or: source .venv/bin/activate  # macOS/Linux

python app/server.py
# API runs at http://localhost:8000
```

**Terminal 2 — Frontend Dev Server**
```bash
cd frontend
npm run dev
# App runs at http://localhost:5173
```

Open your browser at **http://localhost:5173**

---

## Environment Variables

Copy `backend/.env.example` → `backend/.env` and set these values:

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL async connection string | `postgresql+asyncpg://polaris:changeme@localhost:5432/polaris_db` |
| `JWT_ACCESS_SECRET` | Secret for access tokens (min 64 chars) | `python -c "import secrets; print(secrets.token_hex(64))"` |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (different from above) | *(same command, different output)* |
| `ACCESS_TOKEN_EXPIRES_IN` | Access token lifetime in **minutes** | `15` |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token lifetime in **days** | `7` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:5173` |
| `MAX_LOGIN_ATTEMPTS` | Failed attempts before lockout | `5` |
| `LOCK_DURATION_MINUTES` | Lockout duration in minutes | `15` |
| `BOOTSTRAP_ADMIN_ID` | Employee ID for first admin | `OIL-AD-0001` |
| `BOOTSTRAP_ADMIN_PASSWORD` | Password for first admin (clear after use) | `StrongPass@123` |
| `BOOTSTRAP_ADMIN_NAME` | Full name for first admin | `System Administrator` |

---

## First-Time Admin Setup

1. Fill in `BOOTSTRAP_ADMIN_*` variables in `.env`
2. Run: `python scripts/bootstrap_admin.py`
3. Log in at http://localhost:5173 using:
   - **Role tab:** System Administrator
   - **Employee ID:** `OIL-AD-0001` *(or your chosen ID)*
   - **Password:** *(your bootstrap password)*
4. ⚠️ Delete or blank out `BOOTSTRAP_ADMIN_PASSWORD` from `.env` after first login

---

## Default Login Credentials

> These are the credentials created by the bootstrap script using your `.env` values.

| Role | Employee ID | Tab to Select |
|---|---|---|
| System Administrator | `OIL-AD-0001` | System Administrator |
| Field Operator | Created via Admin panel | Field Operator |

> **Note:** The login page enforces role matching — admin credentials won't work under the "Field Operator" tab and vice versa.

---

## Available Scripts

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Start development server at `http://localhost:5173` |
| `npm run build` | Build production bundle to `dist/` |
| `npm run preview` | Preview the production build locally |

### Backend

| Command | Description |
|---|---|
| `python app/server.py` | Start FastAPI dev server at `http://localhost:8000` |
| `alembic upgrade head` | Apply all pending DB migrations |
| `alembic revision --autogenerate -m "desc"` | Generate a new migration |
| `pytest` | Run the full test suite |
| `pytest --cov=app` | Run tests with coverage report |

---

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request against `master`

---

<div align="center">
  <strong>POLARIS</strong> · Oil India Limited · Baghewala Field Operations<br/>
  Heavy Oil Digital Twin & CSS+SRP Joint Optimization Platform<br/>
  <em>Jaisalmer District, Rajasthan — Bikaner-Nagaur Basin</em>
</div>
