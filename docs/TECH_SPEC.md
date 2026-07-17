# Sentinel AI Technical Specification

## System Overview

Sentinel AI is a client-server application with an offline-first operational model:

- A FastAPI backend serves REST endpoints and a WebSocket stream
- A React 19 frontend consumes the backend API and renders the command center UI
- SQLite is the default local database
- SQLAlchemy is used for ORM and persistence
- A deterministic simulation engine generates operational state
- A single AI boundary provides all recommendation logic

## Technology Stack

### Frontend

- React 19
- TypeScript
- Vite
- TailwindCSS
- React Router
- TanStack Query
- Leaflet / React Leaflet
- Framer Motion
- Heroicons
- Chart.js
- Zod
- React Hook Form

### Backend

- FastAPI
- Python 3.11+
- SQLAlchemy 2.x
- SQLite for development and demo
- WebSockets for live operations
- JWT authentication
- Pydantic 2.x
- Docker and Docker Compose

## Architecture Summary

### Frontend

- The app is a routed SPA with a protected shell layout
- Server state is owned by TanStack Query
- Auth state is stored locally and refreshed from `/api/auth/me`
- Shared components provide command-center styling, cards, badges, charts, maps, and timelines

### Backend

- The API is divided into domain routers
- Business logic lives in services, not route handlers
- Repositories own SQLAlchemy access patterns
- Realtime events are broadcast through an in-memory WebSocket manager
- All recommendation logic sits in `backend/app/services/ai.py`

### Offline Intelligence Boundary

- `backend/app/services/ai.py` is the only service that should encode triage, prioritization, allocation, and explanation logic
- Future GPT integration should replace only that module and keep schemas and route contracts stable

## Backend Design

### Layers

1. API layer
2. Dependency layer
3. Service layer
4. Repository layer
5. ORM / database layer
6. Realtime broadcast layer

### API Pattern

- Routes validate inputs with Pydantic schemas
- Routes delegate to services
- Services raise domain errors or `ValueError`
- Routes convert domain errors into HTTP responses

### Security

- Passwords are hashed using PBKDF2
- JWT bearer tokens secure APIs
- Route dependencies enforce role checks
- Inactive accounts are blocked

### Realtime

- The WebSocket connection receives operational events
- Services publish incidents, resources, assignments, messages, and notifications to the broadcaster
- The frontend invalidates queries on event arrival to stay in sync

## Frontend Design

### Shell

- Persistent sidebar navigation
- Command-center canvas container
- Role-aware admin navigation

### State

- API data is fetched through typed helpers
- Auth state is hydrated from storage on boot
- Live events update the dashboard and operational views

### Visual Language

- Dark command-center theme with glass panels
- Severity-based colors for incidents and resources
- Motion for card transitions and live operations
- Dense but readable enterprise layout

## Data Flow

1. User logs in with email and password
2. Backend returns JWT
3. Frontend stores token and refreshes current user
4. Dashboard queries load summary and supporting lists
5. WebSocket events trigger query invalidation
6. Simulation or user action mutates operational data
7. Audit and notification records are written in the same transaction where appropriate

## Quality Requirements

- Validation on every write endpoint
- Strong type alignment between backend schemas and frontend types
- Clear error responses
- Deterministic simulation outputs for seeded runs
- Test coverage for auth, incidents, admin access, and key service logic
- No reliance on external paid APIs

## Performance Requirements

- Initial dashboard load should be quick on commodity laptops
- Queries should be simple and indexed where practical
- WebSocket messages should stay lightweight
- Simulation should avoid expensive synchronous loops

## Future Integration Requirement

- Replace simulated intelligence with GPT-5.6 by editing only `backend/app/services/ai.py`
- Keep route and schema contracts stable so the frontend does not need a redesign for future AI integration
