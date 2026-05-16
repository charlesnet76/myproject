# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an early-stage MER stack project (MongoDB, Express, React) structured under the `MER/` directory. It contains:

- `MER/Backend/` — Node.js/Express API server (ESM modules)
- `MER/Fromend/` — Frontend (React, not yet scaffolded)
- `MER/read_mock_data.py` — Python utility to inspect mock user data
- `MER/MOCK_DATA.csv` — Mock dataset with fields: `id, first_name, last_name, email, gender, ip_address`
- `MER/venv/` — Python virtual environment for the data script

## Commands

### Backend

```bash
cd MER/Backend
npm install        # install dependencies
npm run dev        # start Express server on port 5001
```

The backend uses ES module syntax (`import`/`export`), set via `"type": "module"` in `package.json`.

### Frontend

```bash
cd MER/Fromend
npm install        # install dependencies
npm run dev        # start Vite dev server (default port 5173)
npm run build      # production build → dist/
npm run preview    # preview production build locally
```

### Python data utility

```bash
cd MER
# Activate venv (Windows)
venv\Scripts\activate
python read_mock_data.py
```

## Architecture

The backend is a plain Express 4 server (`MER/Backend/server.js`) with no routes defined yet — just the listener on port 5001. The frontend (`MER/Fromend/`) is a Vite + React app (JavaScript, not TypeScript) using the default Vite React template. No database connection exists yet; mock data lives in `MOCK_DATA.csv` and is read by the Python script for local inspection.

During development the frontend (port 5173) and backend (port 5001) run as separate processes. If you add a proxy, configure it in `MER/Fromend/vite.config.js` under `server.proxy`.
