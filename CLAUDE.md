# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AeroBase** — a MERN stack user directory app with JWT authentication.

```
MER/
├── Backend/        Express + Mongoose API (port 5001)  [ES Modules]
├── Fromend/        Vite + React frontend (port 5173)
├── MOCK_DATA.csv   Sample user data (id, first_name, last_name, email, gender, ip_address)
└── read_mock_data.py  Python utility to inspect mock data
```

## Commands

### Backend
```bash
cd MER/Backend
npm install
npm run dev        # starts on port 5001 — no auto-reload; restart manually after changes
```

### Frontend
```bash
cd MER/Fromend
npm install
npm run dev        # starts on port 5173
npm run lint       # ESLint
npm run build      # requires VITE_API_BASE_URL env var in production
```

### Docker (local)
```bash
docker compose up --build   # backend on :5001, frontend on :80
```

### Python data utility
```bash
cd MER
venv\Scripts\activate   # Windows
python read_mock_data.py
```

### Tests
There is no test suite. CI checks backend syntax via `node --check server.js` and validates the frontend with ESLint + `vite build`.

## Environment Variables

`MER/Backend/.env` (gitignored — see `.env.example`):
```
MONGO_URI=mongodb+srv://...
PORT=5001
JWT_SECRET=...
FRONTEND_URL=http://localhost:5173   # used to build password-reset links in emails
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=...
```

Frontend build-time variable (set via CI `vars.AZURE_BACKEND_URL` in production, empty string in dev — Vite proxy handles dev routing):
```
VITE_API_BASE_URL=https://your-backend-url   # empty in dev; set at build time for production
```

## Architecture

### Backend (`MER/Backend/`)

**Entry:** `server.js` — connects to MongoDB Atlas then starts Express on `PORT`. Uses ES Modules (`"type": "module"`). CORS is locked to `FRONTEND_URL`.

**Health check:** `GET /api/ping` → `{ message: "pong", version: "1.0.0" }` (public, no auth).

**Auth routes** (`routes/auth.routes.js`):
- `POST /api/auth/register` — create admin account (protected — only existing admins can add new admins via the Settings UI)
- `POST /api/auth/login` — authenticate, returns JWT (7-day expiry)
- `GET  /api/auth/me` — current admin (protected)
- `PUT  /api/auth/password` — change password, min 8 chars (protected)
- `POST /api/auth/forgot-password` — sends SendGrid reset email; always 200 to prevent email enumeration
- `POST /api/auth/reset-password/:token` — validates SHA-256 hashed token (1-hour TTL), sets new password
- `GET  /api/auth/admins` — list all admins (protected)
- `DELETE /api/auth/admins/:id` — delete admin; cannot self-delete (protected)

**User routes** (`routes/user.routes.js`):
- `GET  /api/users` — paginated list with search, gender filter, sort; returns `{ users, total, pages, stats }` (protected)
- `POST /api/users` — create user (protected)
- `GET  /api/users/export` — full user list as CSV download (protected)
- `GET  /api/users/:id` — single user (protected)
- `PUT  /api/users/:id` — update user (protected)
- `DELETE /api/users/:id` — delete user (protected)
- `POST /api/users/:id/photo` — upload avatar via multer → Cloudinary (5 MB limit, face-crop to 400×400) (protected)
- `PATCH /api/users/:id/activity` — updates `lastActivity` timestamp (protected)
- `POST /api/users/bulk` — bulk import array of users, skips email duplicates (protected)

The `GET /api/users` sort whitelist is `SORT_FIELDS` in `user.routes.js`; unknown sort fields fall back to `createdAt`.

**Auth flow:** `middleware/auth.middleware.js` extracts the Bearer token and attaches `req.admin`. Applied via `router.use(protect)` in `user.routes.js`; applied per-route in `auth.routes.js`.

**Models:**
- `Admin` — name, email, bcrypt-hashed password (bcryptjs, cost 12), resetToken (SHA-256 hash), resetTokenExpiry. Pre-save hook uses async without `next()` (Mongoose 7+ pattern).
- `User` — first_name, last_name, email (unique), gender (`Male`|`Female`|`Other`), ip_address, photo (Cloudinary URL), lastActivity, timestamps.

### Frontend (`MER/Fromend/src/`)

**Routing** (`main.jsx`): React Router with `/login`, `/forgot-password`, `/reset-password/:token`, and protected `/`. `/register` redirects to `/login` — new admins are added from within the app.

**Auth** (`context/AuthContext.jsx`): stores admin + JWT in `localStorage`. `useAuth()` exposes `admin`, `login()`, `logout()`. When `apiFetch` receives a 401, it fires a `auth:expired` custom DOM event; `AuthContext` listens for it to auto-logout and redirect.

**API calls** (`utils/api.js`): `apiFetch()` wraps `fetch`, attaches `Authorization: Bearer <token>`, prefixes URLs with `VITE_API_BASE_URL`. Skips `Content-Type: application/json` for `FormData` bodies (photo upload).

**Key components:**
- `pages/LoginPage.jsx` / `ForgotPasswordPage.jsx` / `ResetPasswordPage.jsx` — public auth pages
- `components/Navbar.jsx` — aviation logo, admin badge, dark mode toggle, logout
- `components/AdminSettingsModal.jsx` — two-tab modal: "My Profile" (password change) and "Admins" (list + add + delete other admins)
- `components/StatsChart.jsx` — SVG donut chart (Male/Female/Other breakdown)
- `components/AddUserModal.jsx` — create user form
- `components/UserDetailModal.jsx` — view + edit user (PUT /api/users/:id), photo upload (POST /api/users/:id/photo)
- `components/Toast.jsx` — success/error toast notifications

**App-level state** (`App.jsx`): manages user list, pagination (12/page), search debounce (400 ms), gender filter, sort, CSV import/export, bulk delete, and dark mode. All active filters (search, gender, sort, page) are persisted to URL query params via `useSearchParams`.

**CSV import** (client-side parse → `POST /api/users/bulk`): expects columns `first_name`, `last_name`, `email`, `gender`, `ip_address`. Rows missing `email` are dropped before posting.

**Dark mode:** manual toggle in navbar, persisted to `localStorage`, applied via `data-theme` attribute on `<html>`. CSS variables in `index.css` handle both system preference and manual override.

## Key Design Decisions

- **Admin ≠ User**: admin accounts live in a separate `Admin` collection. `/register` route on the backend requires an existing valid JWT — only authenticated admins can create more admins.
- **lastActivity**: updated via `PATCH /activity` every time a user card is clicked (profile viewed). Best-effort — errors are swallowed.
- **Bulk import**: `POST /api/users/bulk` skips duplicates silently (email uniqueness enforced by MongoDB). Frontend parses CSV client-side before posting.
- **Vite proxy**: all `/api/*` requests from the dev frontend are proxied to `localhost:5001` via `vite.config.js`, avoiding CORS in development.
- **Photo upload**: stored on Cloudinary (`aerobase/avatars` folder), URL saved to `User.photo`. Falls back to DiceBear initials avatar when no photo is set.
- **Password reset token**: raw token sent by email; SHA-256 hash stored in DB — prevents plaintext token exposure even if DB is compromised.

## CI/CD (GitHub Actions)

Four workflows in `.github/workflows/`:

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `ci.yml` | push/PR to master | Backend: `node --check server.js`. Frontend: ESLint + Vite build. Docker: `docker compose build`. Uploads `dist` artifact for deploy. |
| `azure-deploy.yml` | CI success on master | Builds & pushes Docker image to ACR → deploys backend to Azure Container Apps → deploys frontend to Azure Static Web Apps. |
| `deploy.yml` | see file | Deploy workflow |
| `preview.yml` | see file | Preview deploys |

Azure deploy requires GitHub Secrets: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_REGISTRY`, `AZURE_STATIC_WEB_APP_TOKEN`, `MONGO_URI`, `JWT_SECRET`, `CLOUDINARY_*`, `SENDGRID_*`. And Variables: `AZURE_RESOURCE_GROUP`, `AZURE_CONTAINER_APP`, `AZURE_BACKEND_URL`, `AZURE_FRONTEND_URL`.
