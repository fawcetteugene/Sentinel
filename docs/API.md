# Sentinel AI API

## Base Conventions

- REST API prefix: `/api`
- Authentication: JWT bearer token
- Response bodies are JSON
- All write endpoints must validate input
- Role-based authorization is enforced at the dependency layer

## Authentication

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/register` `admin only`

## Dashboard

- `GET /api/dashboard/summary`
- `GET /api/dashboard/analytics`
- `GET /api/dashboard/commander`

## Incidents

- `GET /api/incidents`
- `POST /api/incidents`
- `GET /api/incidents/{incident_id}`
- `PATCH /api/incidents/{incident_id}`
- `POST /api/incidents/{incident_id}/analyze`
- `GET /api/incidents/{incident_id}/replay`

## Resources

- `GET /api/resources`
- `POST /api/resources`

## Assignments

- `GET /api/assignments`
- `POST /api/assignments`

## Reports

- `GET /api/reports`
- `POST /api/reports`

## Messages

- `POST /api/messages`

## Notifications

- `GET /api/notifications`
- `POST /api/notifications/{notification_id}/read`

## Live Operations

- `WS /api/ws/operations`

## Admin

- `GET /api/admin/overview`
- `GET /api/admin/users`
- `PATCH /api/admin/users/{user_id}`
- `GET /api/admin/audit-logs`

## Planned Target API Surface

These endpoints are part of the intended product scope and should be introduced as the product expands:

- `GET /api/search`
- `GET /api/weather/current`
- `GET /api/weather/timeline`
- `GET /api/simulation/state`
- `POST /api/simulation/start`
- `POST /api/simulation/stop`
- `POST /api/simulation/step`
- `GET /api/map/layers`
- `GET /api/system/health`
- `GET /api/timeline`

## Error Handling

- `400` validation or domain rule violation
- `401` unauthenticated
- `403` unauthorized or inactive
- `404` missing resource
- `409` conflict on uniqueness or state
- `500` unexpected server error

## Response Contract Notes

- List endpoints return stable, sorted collections
- Detail endpoints should include derived fields needed by the UI
- Recommendation endpoints must return explanatory text, not just scores
