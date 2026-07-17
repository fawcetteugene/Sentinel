# Sentinel AI Architecture

## High-Level View

Sentinel AI uses a three-part architecture:

- Frontend SPA for user interaction and visualization
- FastAPI backend for authentication, operations, simulation, and data access
- SQLite persistence for local operation and demo portability

The application is designed so that the offline simulation layer can later be swapped for real integrations without reworking the UI contract.

## Backend Architecture

### API Layer

- One router per domain
- Auth, dashboard, incidents, resources, assignments, reports, messages, notifications, live operations, and admin routes
- WebSocket endpoint for operations feed

### Service Layer

- `OperationsService` orchestrates incident creation, analysis, resources, assignments, reports, messages, notifications, and admin summaries
- `AIIncidentCommander` centralizes rules-based recommendations
- Future simulation service should own time-based incident/weather/resource mutation

### Repository Layer

- Dedicated repositories encapsulate incident, resource, assignment, user, and notification queries
- Repositories keep SQLAlchemy concerns away from route handlers

### Realtime Layer

- In-memory broadcaster tracks active WebSocket clients
- Services publish operational events as they mutate state
- Frontend listens and refreshes query caches

### Security Layer

- JWT bearer authentication
- Role-based access control
- PBKDF2 password hashing
- Inactive account checks

## Frontend Architecture

### Shell Layout

- Protected layout with left navigation and content panel
- Route-based page rendering
- Responsive behavior for widescreen command-center usage

### Data Access

- `frontend/src/lib/api.ts` contains typed API helpers
- `frontend/src/lib/queries.ts` wraps data access in TanStack Query hooks
- `frontend/src/lib/ws.ts` owns WebSocket bootstrapping

### UI System

- Reusable components for badges, stat cards, maps, timelines, charts, and live feeds
- Consistent visual system for dark command-center layouts
- Motion is used for panel transitions and key cards

## Domain Boundaries

### Incident Domain

- Incident lifecycle
- Attachments
- AI analysis
- Replay events

### Resource Domain

- Availability
- Capacity
- Fuel and maintenance
- Location and assignment

### Mission Domain

- Assignment creation
- ETA tracking
- Status transitions

### Reporting Domain

- Operational summaries
- Incident reports
- Daily reports

### Administration Domain

- User management
- Audit logs
- System oversight

## Expansion Architecture

The target architecture should eventually include:

- Dedicated simulation worker loop
- Weather snapshot generation
- Traffic and road closure engine
- Search subsystem for global cross-object lookup
- Export pipeline for PDF and CSV reports
- Persistent operational timeline and replay storage

## Replaceable AI Boundary

- `backend/app/services/ai.py` is the only module allowed to encode operational recommendation logic
- If GPT-5.6 is introduced later, all other modules should remain stable
