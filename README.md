# Sentinel AI

Sentinel AI is an AI-powered disaster command platform for emergency response teams. It combines incident triage, resource coordination, live operations, analytics, and AI-generated command guidance in a command-center style interface.

## Architecture

- Frontend: React, TypeScript, Vite, TailwindCSS, React Router, React Query, Leaflet, Framer Motion, Heroicons
- Backend: FastAPI, SQLAlchemy, SQLite for development, PostgreSQL compatible through `DATABASE_URL`, JWT auth, WebSockets
- AI: OpenAI Responses API with structured outputs and deterministic fallback analysis
- Deployment: Docker and Docker Compose

## Features

- Dashboard with active incidents, critical incidents, available responders, live alerts, and AI recommendations
- Incident management with AI analysis, severity scoring, and suggested action plans
- Interactive map with incident and resource markers
- Resource management for fleet and logistics assets
- AI Incident Commander briefing panel
- Live operational feed over WebSockets
- Task assignment and mission tracking
- Reports, analytics, authentication, and role-aware UI
- Seeded sample data for a realistic demo

## Roles

- Incident Commander
- Dispatcher
- Field Responder
- Administrator

## Getting Started

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

Backend: `http://localhost:8000`

Frontend: `http://localhost:5173`

## API Documentation

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

## Screenshots

Replace these placeholders with final hackathon screenshots:

- Dashboard
- Live incident map
- AI commander panel
- Resource management
- Analytics

## Project Structure

- `backend/app/core` configuration, database, security, enums
- `backend/app/models.py` relational ORM schema
- `backend/app/repositories` data access layer
- `backend/app/services` business logic and AI integration
- `backend/app/api/routes` HTTP and WebSocket endpoints
- `frontend/src/components` reusable UI
- `frontend/src/pages` routed views
- `frontend/src/lib` API client, auth, and WebSocket utilities

## Future Improvements

- Replace the fallback AI path with authenticated OpenAI key management
- Add file upload storage for images and voice notes
- Add offline caching and background sync
- Expand audit logs and replay playback
- Add PDF rendering for downloadable reports
- Integrate real GIS layers, routes, and evacuation zones

