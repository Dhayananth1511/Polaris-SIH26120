# Deploying Polaris to Render

This guide outlines how to deploy the **Polaris Heavy Oil Wellbore Digital Twin** platform to [Render](https://render.com).

The deployment architecture consists of:
1. **PostgreSQL Database** (`polaris-db`): Persistent storage for well telemetry, production history, SRP operations, failure events, and user accounts.
2. **FastAPI Backend Web Service** (`polaris-backend`): Python 3.11 service executing real-time physics engines, ML pipelines (XGBoost, SHAP, Isolation Forest), and REST API.
3. **React Vite Frontend Static Site** (`polaris-frontend`): High-speed CDN-hosted UI with automatic `/api/*` proxy rewrite rules to eliminate CORS complications.

---

## Method 1: Automated Deployment via Render Blueprint (Recommended)

Polaris includes a pre-configured [`render.yaml`](file:///d:/Polaris/render.yaml) blueprint at the repository root. This automates the setup of the database, backend, and frontend in one click.

### Step 1: Push Code to GitHub / GitLab
Make sure your repository contains all files including `database/`, `backend/`, `frontend/`, and `render.yaml`:
```bash
git init
git add .
git commit -m "Configure Polaris for Render deployment"
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Render
1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** in the top-right corner and select **Blueprint**.
3. Connect your Git repository.
4. Render will detect `render.yaml` and display the three resources:
   - `polaris-db` (PostgreSQL Database)
   - `polaris-backend` (Web Service)
   - `polaris-frontend` (Static Site)
5. Review the plan settings and click **Apply**.

Render will automatically provision the database, install Python and Node dependencies, run database migrations and initial seed data, and launch both services.

---

## Method 2: Manual Step-by-Step Deployment

If you prefer to configure each service manually via the Render web dashboard:

### 1. Create the PostgreSQL Database
1. Go to **New +** → **PostgreSQL**.
2. **Name**: `polaris-db`
3. **Database**: `polaris_db`
4. **User**: `polaris_admin`
5. **Region**: Oregon (or your preferred region; keep all services in the same region).
6. **Plan**: Free (or Starter).
7. Click **Create Database**.
8. Once provisioned, copy the **Internal Database URL** (e.g., `postgresql://polaris_admin:PASSWORD@dpg-...:5432/polaris_db`).

---

### 2. Deploy Backend Web Service
1. Go to **New +** → **Web Service**.
2. Connect your Git repository.
3. Configure the service:
   - **Name**: `polaris-backend`
   - **Region**: Same as database (e.g., Oregon)
   - **Branch**: `main`
   - **Root Directory**: *(Leave empty / root)*
   - **Environment**: `Python 3`
   - **Build Command**:
     ```bash
     pip install --upgrade pip && pip install -r backend/requirements.txt
     ```
   - **Pre-Deploy Command** *(Optional, under Advanced)*:
     ```bash
     cd backend && alembic upgrade head && python scripts/seed_database.py && python scripts/apply_indexes.py
     ```
   - **Start Command**:
     ```bash
     cd backend && uvicorn app.server:app --host 0.0.0.0 --port $PORT --proxy-headers
     ```
   - **Health Check Path**: `/api/health`
4. In **Environment Variables**, add:
   | Key | Value | Description |
   |---|---|---|
   | `PYTHON_VERSION` | `3.11.9` | Ensures compatible binary wheels for ML libraries |
   | `NODE_ENV` | `production` | Production mode flag |
   | `DATABASE_URL` | *(Paste Internal Database URL)* | Polaris automatically converts `postgresql://` to `postgresql+asyncpg://` |
   | `JWT_ACCESS_SECRET` | *(64-character random hex string)* | E.g. `python -c "import secrets; print(secrets.token_hex(32))"` |
   | `JWT_REFRESH_SECRET` | *(64-character random hex string)* | E.g. `python -c "import secrets; print(secrets.token_hex(32))"` |
   | `ALLOWED_ORIGINS` | `https://polaris-frontend.onrender.com,http://localhost:5173` | Replace with your frontend URL once created |
   | `COOKIE_SAMESITE` | `lax` | `lax` when using Static Site rewrites; `none` if cross-domain |
   | `BOOTSTRAP_ADMIN_ID` | `OIL-AD-0001` | Initial admin employee ID |
   | `BOOTSTRAP_ADMIN_PASSWORD` | `YourSecurePassword2026!` | Initial admin password (min 12 characters) |
   | `BOOTSTRAP_ADMIN_NAME` | `System Administrator` | Admin display name |
5. Click **Create Web Service**.

---

### 3. Deploy Frontend Static Site
1. Go to **New +** → **Static Site**.
2. Connect your Git repository.
3. Configure the site:
   - **Name**: `polaris-frontend`
   - **Branch**: `main`
   - **Root Directory**: *(Leave empty)*
   - **Build Command**:
     ```bash
     cd frontend && npm install && npm run build
     ```
   - **Publish Directory**:
     ```bash
     frontend/dist
     ```
4. Configure **Redirects / Rewrites** *(Under Static Site Settings)*:
   Add the following two rules:

   | Type | Source | Destination | Purpose |
   |---|---|---|---|
   | **Rewrite** | `/api/*` | `https://polaris-backend.onrender.com/api/*` | Proxies all API requests to backend (Same-Origin) |
   | **Rewrite** | `/*` | `/index.html` | Client-side SPA routing (prevents 404 on refresh) |

   *(Note: Replace `https://polaris-backend.onrender.com` with your actual backend URL).*
5. Click **Create Static Site**.

---

## Seeding Database on Render (If Not Using Pre-Deploy Command)

If you did not specify a pre-deploy command during setup, you can seed the database via the Render **Shell** tab on your `polaris-backend` service:

```bash
cd backend
# 1. Run migrations
alembic upgrade head

# 2. Seed Baghewala datasets and admin user
python scripts/seed_database.py

# 3. Apply performance indexes
python scripts/apply_indexes.py
```

---

## Default Login Credentials

After seeding, log in using the configured bootstrap credentials:
- **Employee ID**: `OIL-AD-0001`
- **Password**: Set in `BOOTSTRAP_ADMIN_PASSWORD` (e.g., `YourSecurePassword2026!` or auto-generated blueprint secret).

---

## Troubleshooting & Verification

1. **Verify Backend Health**:
   Visit `https://<your-backend>.onrender.com/api/health`. You should receive:
   ```json
   {"status":"operational","service":"polaris-api"}
   ```
2. **CORS Issues**:
   Ensure `ALLOWED_ORIGINS` on the backend includes the exact URL of your frontend without trailing slashes:
   `https://<your-frontend>.onrender.com`
3. **Database Driver Errors**:
   Polaris automatically handles `postgres://` or `postgresql://` URLs from Render and converts them to `postgresql+asyncpg://`.
4. **404 on Page Refresh**:
   Ensure the `/*` -> `/index.html` rewrite rule is added under **Redirects/Rewrites** in the frontend Static Site settings.
