# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AeroBase** — a MERN stack user directory app with JWT authentication, activity logging, analytics, and per-user notes.

```
myproject/
├── MER/
│   ├── Backend/        Express + Mongoose API (port 5001)  [ES Modules]
│   │   ├── middleware/
│   │   │   └── auth.middleware.js
│   │   ├── models/
│   │   │   ├── admin.model.js
│   │   │   ├── user.model.js
│   │   │   ├── activity.model.js
│   │   │   └── note.model.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── user.routes.js
│   │   │   ├── activity.routes.js
│   │   │   └── analytics.routes.js
│   │   ├── server.js
│   │   ├── railway.toml
│   │   └── Dockerfile
│   ├── Fromend/        Vite + React frontend (port 5173)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ActivityFeed.jsx
│   │   │   │   ├── AddUserModal.jsx
│   │   │   │   ├── AdminSettingsModal.jsx
│   │   │   │   ├── Navbar.jsx
│   │   │   │   ├── NotificationBell.jsx
│   │   │   │   ├── StatsChart.jsx
│   │   │   │   ├── Toast.jsx
│   │   │   │   └── UserDetailModal.jsx
│   │   │   ├── context/
│   │   │   │   └── AuthContext.jsx
│   │   │   ├── pages/
│   │   │   │   ├── AnalyticsPage.jsx
│   │   │   │   ├── ForgotPasswordPage.jsx
│   │   │   │   ├── LandingPage.jsx
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   ├── RegisterPage.jsx
│   │   │   │   └── ResetPasswordPage.jsx
│   │   │   ├── utils/
│   │   │   │   └── api.js
│   │   │   ├── App.jsx
│   │   │   ├── index.css
│   │   │   └── main.jsx
│   │   ├── vercel.json
│   │   └── Dockerfile
│   ├── MOCK_DATA.csv   Sample user data
│   └── read_mock_data.py
├── azure/
│   └── setup.sh
├── docker-compose.yml
└── .github/workflows/
    ├── ci.yml
    ├── azure-deploy.yml
    └── preview.yml
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

**Entry:** `server.js` — connects to MongoDB Atlas then starts Express on `PORT`. Uses ES Modules (`"type": "module"`). CORS is locked to `FRONTEND_URL`. Cloudinary is configured globally at startup.

**Health check:** `GET /api/ping` → `{ message: "pong", version: "1.0.0" }` (public, no auth).

**Auth routes** (`routes/auth.routes.js`):
- `POST /api/auth/register` — create admin account (protected — only existing admins can add new admins)
- `POST /api/auth/login` — authenticate, returns JWT (7-day expiry) + admin object with `theme`
- `GET  /api/auth/me` — current admin, returns object with `theme` (protected)
- `PUT  /api/auth/password` — change password, min 8 chars (protected)
- `POST /api/auth/forgot-password` — sends SendGrid reset email; always 200 to prevent email enumeration
- `POST /api/auth/reset-password/:token` — validates SHA-256 hashed token (1-hour TTL), sets new password
- `PATCH /api/auth/theme` — update admin's preferred theme (`light`|`dark`) (protected)
- `GET  /api/auth/admins` — list all admins (protected)
- `DELETE /api/auth/admins/:id` — delete admin; cannot self-delete (protected)

**User routes** (`routes/user.routes.js`):
- `GET  /api/users` — paginated list with search, gender filter, status filter, sort; returns `{ users, total, page, pages, stats }` (protected)
- `POST /api/users` — create user; writes ActivityLog (protected)
- `GET  /api/users/export` — full user list as CSV download; includes `status` column (protected)
- `GET  /api/users/:id` — single user (protected)
- `PUT  /api/users/:id` — update user; writes ActivityLog (protected)
- `DELETE /api/users/:id` — delete user + cascade-deletes all their Notes; writes ActivityLog (protected)
- `POST /api/users/:id/photo` — upload avatar via multer → Cloudinary (5 MB limit, face-crop to 400×400) (protected)
- `PATCH /api/users/:id/activity` — updates `lastActivity` timestamp (protected)
- `POST /api/users/bulk` — bulk import array of users, skips email duplicates; writes ActivityLog if any imported (protected)
- `GET  /api/users/:id/notes` — list notes for a user, newest first (protected)
- `POST /api/users/:id/notes` — create note for a user (protected)
- `DELETE /api/users/:id/notes/:noteId` — delete a specific note (protected)
- `POST /api/users/:id/email` — send email to user via SendGrid; writes ActivityLog (protected)

The `GET /api/users` sort whitelist is `SORT_FIELDS` in `user.routes.js` (`first_name`, `last_name`, `email`, `createdAt`, `lastActivity`); unknown fields fall back to `createdAt`. Max page size is 50, default 12.

**Activity routes** (`routes/activity.routes.js`):
- `GET /api/activity` — returns last 50 ActivityLog entries sorted by `createdAt` desc (protected)

**Analytics routes** (`routes/analytics.routes.js`):
- `GET /api/analytics` — returns `{ registrationsByDay, statusBreakdown, genderBreakdown, recentlyActive, totals }` (protected)
  - `registrationsByDay`: daily registration counts for the last 30 days
  - `statusBreakdown` / `genderBreakdown`: aggregation arrays `[{ _id, count }]`
  - `recentlyActive`: top 5 users by `lastActivity` (name, email, photo, lastActivity)
  - `totals`: `{ total, active, inactive, banned }`

**Auth flow:** `middleware/auth.middleware.js` extracts the Bearer token and attaches `req.admin`. Applied via `router.use(protect)` in `user.routes.js`, `activity.routes.js`, and `analytics.routes.js`; applied per-route in `auth.routes.js`.

**Models:**
- `Admin` — name, email, bcrypt-hashed password (bcryptjs, cost 12), resetToken (SHA-256 hash), resetTokenExpiry, theme (`light`|`dark`, default `light`). Pre-save hook hashes password on modification (Mongoose 7+ async pattern without `next()`).
- `User` — first_name, last_name, email (unique), gender (`Male`|`Female`|`Other`), ip_address, status (`Active`|`Inactive`|`Banned`, default `Active`), photo (Cloudinary URL), lastActivity, timestamps.
- `ActivityLog` — action, adminName, targetName (default `""`), detail (default `""`), timestamps. Written best-effort (errors swallowed) from user route handlers. Action values: `created`, `updated`, `deleted`, `bulk_imported`, `emailed`.
- `Note` — userId (ObjectId ref to User, required), text (max 1000 chars, required), adminName (required), timestamps. Cascade-deleted when the referenced User is deleted.

### Frontend (`MER/Fromend/src/`)

**Routing** (`main.jsx`): React Router with the following routes:
- `/` — `LandingPage` (public)
- `/login` — `LoginPage` (public, redirects to `/dashboard` if already authenticated)
- `/register` — redirects to `/login` (admins are added from within the app)
- `/forgot-password` — `ForgotPasswordPage` (public, redirects to `/dashboard` if authenticated)
- `/reset-password/:token` — `ResetPasswordPage` (public)
- `/dashboard` — `App` (protected)
- `/analytics` — `AnalyticsPage` (protected)

**Auth** (`context/AuthContext.jsx`): stores admin + JWT in `localStorage`. `useAuth()` exposes `admin`, `login()`, `logout()`. When `apiFetch` receives a 401, it fires an `auth:expired` custom DOM event; `AuthContext` listens to auto-logout and redirect to `/login`.

**API calls** (`utils/api.js`): `apiFetch()` wraps `fetch`, attaches `Authorization: Bearer <token>`, prefixes URLs with `VITE_API_BASE_URL`. Skips `Content-Type: application/json` for `FormData` bodies (photo upload).

**Key pages:**
- `pages/LandingPage.jsx` — public marketing page with hero section, feature showcase, and CTA. Auto-redirects authenticated users to `/dashboard`.
- `pages/LoginPage.jsx` / `ForgotPasswordPage.jsx` / `ResetPasswordPage.jsx` — public auth pages
- `pages/AnalyticsPage.jsx` — protected analytics dashboard: registration bar chart (last 30 days), totals by status, gender breakdown, recently active users list.
- `pages/RegisterPage.jsx` — admin registration form (accessible via AdminSettingsModal flow; `/register` route itself redirects to `/login`)

**Key components:**
- `components/Navbar.jsx` — aviation logo, admin badge, dark mode toggle, logout, notification bell
- `components/NotificationBell.jsx` — bell icon showing unread activity count; dropdown with last 20 activities; unread state persisted to `localStorage`; auto-refreshes every 30 seconds
- `components/ActivityFeed.jsx` — collapsible widget in the dashboard showing recent actions (created, updated, deleted, bulk_imported, emailed) with admin name, target, timestamp, and color-coded action type
- `components/AdminSettingsModal.jsx` — two-tab modal: "My Profile" (password change) and "Admins" (list + add + delete other admins)
- `components/StatsChart.jsx` — SVG donut chart (Male/Female/Other breakdown)
- `components/AddUserModal.jsx` — create user form
- `components/UserDetailModal.jsx` — view + edit user (PUT /api/users/:id), photo upload, per-user notes, email-user form
- `components/Toast.jsx` — success/error toast notifications

**App-level state** (`App.jsx`): manages user list, pagination (12/page), search with history, gender filter, status filter, sort, CSV import/export, bulk delete with confirmation, and dark mode. All active filters (search, gender, status, sort, page) are persisted to URL query params via `useSearchParams`.

**CSV import** (client-side parse → `POST /api/users/bulk`): expects columns `first_name`, `last_name`, `email`, `gender`, `ip_address`. Rows missing `email` are dropped before posting.

**Dark mode:** manual toggle in navbar, synced to `PATCH /api/auth/theme` to persist per-admin. Applied via `data-theme` attribute on `<html>`. CSS variables in `index.css` handle both system preference and manual override.

## Key Design Decisions

- **Admin ≠ User**: admin accounts live in a separate `Admin` collection. The `/register` route on the backend requires an existing valid JWT — only authenticated admins can create more admins.
- **User status**: `User.status` (`Active`|`Inactive`|`Banned`, default `Active`) is filterable on the list endpoint and exported in CSV. It is separate from `lastActivity`.
- **Admin theme**: each admin's `light`/`dark` preference is stored on `Admin.theme` and synced via `PATCH /api/auth/theme`. The frontend reads it from the login/me response and applies it immediately.
- **Activity logging**: create, update, delete, bulk import, and email actions write an `ActivityLog` document best-effort (errors never surface to callers). The `ActivityFeed` component and `NotificationBell` poll `GET /api/activity`.
- **Notes**: per-user notes (admin-authored, max 1000 chars) live in a separate `Note` collection linked by `userId`. They cascade-delete when their parent User is deleted.
- **Email**: admins can send a custom subject+message email to any user via `POST /api/users/:id/email`, which uses SendGrid and records an activity log.
- **lastActivity**: updated via `PATCH /api/users/:id/activity` every time a user card is clicked (profile viewed). Best-effort — errors are swallowed.
- **Bulk import**: `POST /api/users/bulk` skips duplicates silently (email uniqueness enforced by MongoDB). Frontend parses CSV client-side before posting.
- **Vite proxy**: all `/api/*` requests from the dev frontend are proxied to `localhost:5001` via `vite.config.js`, avoiding CORS in development.
- **Photo upload**: stored on Cloudinary (`aerobase/avatars` folder), URL saved to `User.photo`. Falls back to DiceBear initials avatar when no photo is set.
- **Password reset token**: raw token sent by email; SHA-256 hash stored in DB — prevents plaintext token exposure even if DB is compromised.

## CI/CD (GitHub Actions)

Three workflows in `.github/workflows/`:

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `ci.yml` | push/PR to master | Backend: `node --check server.js`. Frontend: ESLint + Vite build (uses `vars.AZURE_BACKEND_URL`). Docker: `docker compose build`. Uploads `dist` artifact for master branch. |
| `azure-deploy.yml` | CI success on master | Builds & pushes Docker image to ACR → deploys backend to Azure Container Apps → deploys frontend to Azure Static Web Apps. Includes health check and deployment summary. |
| `preview.yml` | pull_request | Builds frontend with Vercel CLI and deploys a PR preview; comments the preview URL on the PR. |

**Azure deploy** requires GitHub Secrets: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_REGISTRY`, `AZURE_STATIC_WEB_APP_TOKEN`, `MONGO_URI`, `JWT_SECRET`, `CLOUDINARY_*`, `SENDGRID_*`. And Variables: `AZURE_RESOURCE_GROUP`, `AZURE_CONTAINER_APP`, `AZURE_BACKEND_URL`, `AZURE_FRONTEND_URL`.

**Vercel preview** requires GitHub Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

## Deployment Options

| Target | Config | Notes |
|--------|--------|-------|
| Docker (local) | `docker-compose.yml` | Backend :5001, frontend :80 |
| Azure Container Apps + Static Web Apps | `azure-deploy.yml` | Production; backend image built from `MER/Backend/Dockerfile` |
| Railway | `MER/Backend/railway.toml` | Backend only; Dockerfile builder, health check `/api/ping`, restart on failure (max 3 retries) |
| Vercel | `MER/Fromend/vercel.json` | Frontend only; SPA rewrite rule sends all routes to `index.html` |
