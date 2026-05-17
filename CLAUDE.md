# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AeroBase** — a MERN stack user directory app with JWT authentication.

```
MER/
├── Backend/        Express + Mongoose API (port 5001)
├── Fromend/        Vite + React frontend (port 5173)
├── MOCK_DATA.csv   Sample user data (id, first_name, last_name, email, gender, ip_address)
└── read_mock_data.py  Python utility to inspect mock data
```

## Commands

### Backend
```bash
cd MER/Backend
npm install
npm run dev        # starts on port 5001
```

### Frontend
```bash
cd MER/Fromend
npm install
npm run dev        # starts on port 5173
npm run build
npm run preview
```

### Python data utility
```bash
cd MER
venv\Scripts\activate   # Windows
python read_mock_data.py
```

## Environment Variables

`MER/Backend/.env` (gitignored — see `.env.example`):
```
MONGO_URI=mongodb+srv://...
PORT=5001
JWT_SECRET=...
```

## Architecture

### Backend (`MER/Backend/`)

**Entry:** `server.js` — connects to MongoDB Atlas then starts Express on `PORT`.

**Routes:**
- `POST /api/auth/register` — create admin account, returns JWT
- `POST /api/auth/login` — authenticate, returns JWT
- `GET  /api/auth/me` — current admin (protected)
- `GET/POST /api/users` — list / create users (all protected)
- `GET/PUT/DELETE /api/users/:id` — single user CRUD (protected)
- `PATCH /api/users/:id/activity` — updates `lastActivity` timestamp
- `POST /api/users/bulk` — bulk import array of users, skips duplicates

**Auth flow:** `middleware/auth.middleware.js` extracts the Bearer token and attaches `req.admin`. Applied via `router.use(protect)` in `user.routes.js`.

**Models:**
- `Admin` — name, email, bcrypt-hashed password. Pre-save hook uses async without `next()` (Mongoose 7+ pattern).
- `User` — first_name, last_name, email (unique), gender, ip_address, lastActivity, timestamps.

### Frontend (`MER/Fromend/src/`)

**Routing** (`main.jsx`): React Router with `/login`, `/register`, and protected `/`.

**Auth** (`context/AuthContext.jsx`): stores admin + JWT in `localStorage`. `useAuth()` hook exposes `admin`, `login()`, `logout()`.

**API calls** (`utils/api.js`): `apiFetch()` wraps `fetch` and automatically attaches `Authorization: Bearer <token>` to every request. All components use `apiFetch` instead of `fetch`.

**Key components:**
- `pages/LoginPage.jsx` / `RegisterPage.jsx` — public auth pages
- `components/Navbar.jsx` — aviation logo, admin badge, dark mode toggle, logout
- `components/StatsChart.jsx` — SVG donut chart (Male/Female/Other breakdown)
- `components/AddUserModal.jsx` — create user form
- `components/UserDetailModal.jsx` — view + edit user (PUT /api/users/:id)
- `components/Toast.jsx` — success/error toast notifications

**Dark mode:** manual toggle in navbar, persisted to `localStorage`, applied via `data-theme` attribute on `<html>`. CSS variables in `index.css` handle both system preference and manual override.

## Key Design Decisions

- **Admin ≠ User**: admin accounts (who manage the directory) live in a separate `Admin` collection, not in `User`.
- **lastActivity**: updated via `PATCH /activity` every time a user card is clicked (profile viewed). Best-effort — errors are swallowed.
- **Bulk import**: `POST /api/users/bulk` skips duplicates silently (email uniqueness enforced by MongoDB). Frontend parses CSV client-side before posting.
- **Vite proxy**: all `/api/*` requests from the dev frontend are proxied to `localhost:5001` via `vite.config.js`, avoiding CORS in development.
