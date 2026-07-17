# Sentinel AI Milestones

## Milestone 1 Verification

- Backend boots cleanly
- Root route returns a non-404 response
- Health endpoint responds with 200
- JWT login works with seeded users
- RBAC blocks unauthorized admin access
- Frontend loads without import resolution errors
- Dashboard loads seeded operational data

## Milestone 2 Verification

- Simulation generates incidents without manual input
- Weather changes over time
- Resource states change automatically
- Live operational events appear in the WebSocket feed
- Deterministic seed produces repeatable state transitions

## Milestone 3 Verification

- Incident lifecycle can be updated end to end
- Missions can be created and tracked
- Replay timeline returns ordered event history
- Map shows incidents and resources with severity styling
- Operational recommendations include explanations

## Milestone 4 Verification

- Admin overview counts are correct
- User activation toggles are reflected in the UI
- Audit logs record system actions
- System health view exposes backend and simulation status
- Global search returns results across major entities

## Milestone 5 Verification

- Production frontend build succeeds
- Backend test suite passes
- Docker Compose starts both services
- README describes architecture, setup, and deployment
- Demo flow can be completed without blockers
