# Sentinel AI Database Design

## Storage Strategy

- SQLite for local development and demos
- SQLAlchemy ORM for schema management
- UUIDs are not required for the current build because the deployment target is a single-node demo environment
- Time-series and simulation history should be normalized enough to support replay and analytics

## Current Core Tables

### `users`

- Identity and role
- Authentication hash
- Duty and activity flags
- Optional badge, phone, avatar, and last known location

### `locations`

- Reusable coordinate records
- Can point to incidents, resources, or users
- Stores label, address, source, latitude, and longitude

### `incidents`

- Core disaster record
- Title, description, coordinates, severity, hazard type, people affected, status, assignment, analysis, recommendations, and replay metadata

### `incident_attachments`

- Image, voice, or other media associated with incidents

### `resources`

- Fleet, medical, logistics, and support resources
- Status, capacity, quantity, fuel, ETA, and assigned incident fields

### `assignments`

- Incident-linked responder missions
- Tracks assignee, mission, location, priority, ETA, instructions, and completion status

### `reports`

- Generated situation and incident reports
- Optional PDF links

### `messages`

- Operational messages, logs, alerts, and direct messages
- Supports incident context and metadata

### `notifications`

- User-targeted notifications with read state

### `audit_logs`

- Append-only record of system actions
- Stores actor, action, entity, severity, and structured details

## Relationship Design

- One user can create many incidents
- One incident can have many attachments, assignments, reports, messages, and derived replay events
- One user can receive many notifications
- One resource can be assigned to one incident at a time
- Audit logs are independent and append-only

## Planned Expansion Tables

These tables are part of the target product design and should be introduced when the matching milestone is implemented:

### `weather_snapshots`

- Simulated weather state over time
- Rain, wind, humidity, lightning, heat, and warnings

### `simulation_state`

- Current clock, speed, scenario, and seed values
- Persistent state for deterministic replay

### `road_closures`

- Active closures, reason, severity, and coordinates

### `safe_routes`

- Suggested evacuation or mission routes

### `mission_timeline_events`

- Operational event stream for replay

### `system_health_snapshots`

- Server, database, websocket, and simulation health over time

### `global_search_index`

- Optional denormalized search table or FTS strategy

## Indexing Guidance

- Index role, status, severity, and timestamps used in dashboards
- Index incident foreign keys for attachments, assignments, and reports
- Index notification `user_id` and audit `created_at`
- Index resource status and kind for filtering

## Integrity Rules

- Incident severity and status should be constrained by enums
- Audit logs should never be edited in place
- Updates to incidents and resources should always preserve historical timestamps
- Simulation-generated records should be deterministic for a given seed
