# Sentinel AI Product Requirements Document

## Product Summary

Sentinel AI is a production-style Emergency Operations Center platform for governments, NGOs, hospitals, and disaster response agencies. It provides a single operational surface for incident monitoring, mission control, responder dispatch, resource tracking, weather awareness, reporting, analytics, replay, and simulation.

The product must feel like enterprise emergency-management software rather than a hackathon prototype. It must run fully offline with deterministic mock data and simulated intelligence. All recommendation logic is isolated behind a single service boundary so a future GPT integration can replace only one module.

## Problem Statement

Emergency response teams usually operate across fragmented systems: spreadsheets, radios, whiteboards, GIS tools, manual briefs, and separate incident trackers. That fragmentation slows response, hides resource constraints, and makes it difficult to maintain a coherent operational picture.

Sentinel AI addresses that by combining incident data, missions, responder state, resources, maps, weather, analytics, and auditability into one command-center workflow.

## Product Goals

- Provide a credible disaster command center interface with enterprise-grade polish
- Support end-to-end emergency coordination from incident creation to resolution
- Simulate incidents, weather, traffic, resource constraints, and mission flow offline
- Deliver AI-like recommendations without external AI services
- Keep all recommendation logic behind a single replaceable AI service boundary
- Make every operational action visible through live feeds, timelines, and audit logs
- Be easy to demo, explain, and extend during hackathon judging

## Non-Goals

- No OpenAI API usage in the current implementation
- No Google Maps API
- No paid weather APIs
- No Firebase or Supabase
- No dependency on external AI services
- No production GIS routing service in the initial build

## Target Users

- Incident Commander: coordinates strategy, priority, and escalation
- Dispatcher: triages incidents, assigns missions, and tracks resources
- Field Responder: receives tasks and updates operational status
- Administrator: manages users, system oversight, and auditability
- Observer / Demo Operator: uses the app for live presentations and walkthroughs

## Core Use Cases

### 1. Incident Monitoring

The user can view active incidents on a dashboard and map, inspect severity, priority, recommended resources, and current status, and track changes in near real time.

### 2. Mission Control

The user can generate operational plans, assign responders and vehicles, estimate ETAs, and review AI-style explanations for recommendations.

### 3. Resource Management

The user can see fleet, logistics, medical, shelter, and support assets, then track availability, fuel, maintenance, and capacity.

### 4. Weather Awareness

The user can monitor simulated weather threats, flood warnings, storms, heatwaves, lightning, and road closure impacts.

### 5. Reporting and Analytics

The user can generate incident, mission, daily, weekly, monthly, responder, vehicle, hospital, shelter, and analytics reports.

### 6. Replay and Simulation

The user can replay an incident timeline or run against a living simulation that generates new incidents and evolving conditions.

### 7. Administration

The administrator can review users, audit logs, and system health, and can enable or disable operational accounts.

## Functional Requirements

### Authentication

- JWT-based login
- Role-based route protection
- Seeded demo users for deterministic local testing
- Secure password hashing

### Dashboard

- Show active incidents, critical incidents, response posture, responder availability, vehicle counts, alerts, capacity, and system health
- Surface live alerts and recent activity
- Include command recommendations and quick actions

### Incident Management

- Create, update, analyze, and replay incidents
- Attach images and voice notes as metadata
- Support all listed disaster categories
- Compute priority, severity score, escalation probability, and recommended resources

### Mission Control

- Assign missions to responders and track status
- Allocate vehicles and supporting assets
- Calculate estimated response times
- Produce plain-language rationale for every recommendation

### Map

- Use OpenStreetMap tiles through Leaflet
- Display incidents, responders, vehicles, hospitals, shelters, fire stations, police stations, roads, closures, safe routes, and weather overlays
- Change marker color by severity and animate live assets

### Simulation

- Generate large volumes of realistic incidents and operational entities
- Evolve weather, traffic, fuel, hospital capacity, shelter capacity, and vehicle status automatically
- Create new operational events over time
- Produce deterministic recommendations from local rules

### Reports

- Generate report records from current state
- Exportable formats should be designed for PDF and CSV output

### Analytics

- Display incident trends, mission completion, response time, resource usage, capacity usage, and weather trends

### Admin and Monitoring

- View system health, audit logs, and user activity
- Keep all system actions auditable

## Non-Functional Requirements

- Offline-first operation
- Deterministic seeded simulation for demos and tests
- Fast first paint and usable performance on modest hardware
- Input validation on all write endpoints
- Secure session handling and role checks
- Responsive layout for desktop and tablet
- Professional visual polish with loading and empty states
- Test coverage for auth, incident flows, and key dashboard behaviors

## Success Criteria

- A judge can understand the app in under two minutes
- The dashboard feels like a real emergency command center
- The map and mission control surfaces look operationally credible
- The simulation keeps the system active without manual input
- The app works without paid services or external AI dependencies
- The codebase clearly isolates future GPT integration to one service module

## Product Principles

- Operational credibility over novelty
- Deterministic local behavior over opaque magic
- Clear explanations over silent automation
- Strong visual hierarchy over generic dashboard templates
- Incremental, verifiable delivery over a single large release
