# Sentinel AI

Sentinel AI is an offline-first disaster command platform for emergency response teams. It combines incident triage, mission control, resource coordination, weather awareness, analytics, and deterministic command guidance in a command-center interface.

## What It Does

- Monitors incidents in a live executive dashboard
- Dispatches teams and tracks operational assignments
- Simulates responders, vehicles, hospitals, shelters, weather, and resource pressure
- Provides offline command recommendations with explanations
- Records operational activity and audit logs
- Supports reporting, analytics, and replay

## Architecture

- Frontend: React 19, TypeScript, Vite, TailwindCSS, React Router, TanStack Query, Leaflet, Framer Motion, Heroicons
- Backend: FastAPI, SQLAlchemy, SQLite, JWT auth, WebSockets
- AI: Offline rules engine behind a single service boundary, designed for future GPT replacement without broad rewrites
- Deployment: Docker and Docker Compose

## Key Features

- Professional dashboard with active incidents, critical incidents, responder availability, alerts, and recommendations
- Incident management with AI analysis, severity scoring, and suggested action plans
- Interactive map with incident and resource markers
- Resource management for fleet and logistics assets
- AI Incident Commander briefing panel powered by deterministic offline rules
- Live operational feed over WebSockets
- Task assignment and mission tracking
- Reports, analytics, authentication, and role-aware UI
- Seeded sample data for a realistic demo

## Roles

- Incident Commander
- Dispatcher
- Field Responder
- Administrator

## Local Development

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Default Demo Accounts

- `admin@sentinel.ai` / `admin123`
- `commander@sentinel.ai` / `admin123`
- `dispatcher@sentinel.ai` / `admin123`
- `responder@sentinel.ai` / `admin123`

## Docker

```bash
docker compose up --build
```

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`

## API Documentation

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

## Folder Structure

- `backend/app/core` configuration, database, security, enums
- `backend/app/models.py` ORM schema
- `backend/app/repositories` data access layer
- `backend/app/services` business logic, AI boundary, and operations
- `backend/app/api/routes` HTTP and WebSocket endpoints
- `frontend/src/components` reusable UI primitives
- `frontend/src/pages` routed views
- `frontend/src/lib` API client, auth, and WebSocket helpers
- `docs` product, architecture, API, database, and roadmap documentation

## Database Schema

See [docs/DATABASE.md](/home/fawcett/Desktop/PersonalWork/SentinelAI/docs/DATABASE.md) for the current and planned data model.

## Deployment

- Docker Compose runs the backend and frontend together for local demo environments
- The backend uses `DATABASE_URL` for portability
- The frontend uses the backend API over HTTP and WebSockets

## Screenshots

Replace these placeholders with final hackathon screenshots:

- Dashboard
- Live incident map
- AI commander panel
- Resource management
- Analytics

## Future GPT Integration

All recommendation logic is isolated in `backend/app/services/ai.py`. Replacing simulated intelligence with GPT-5.6 later should require changing only that module, while preserving the API and UI contracts.

## Notes

- The application intentionally avoids paid APIs and external AI services
- Weather, traffic, resource pressure, and incident generation are simulated locally
