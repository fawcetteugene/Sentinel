"""FastAPI application entrypoint."""

from __future__ import annotations

import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.routes import admin, assignments, auth, dashboard, incidents, live, messages, notifications, reports, resources, search, simulation
from app.core.config import get_settings
from app.core.database import Base, engine, SessionLocal
from app.seed import seed_database
from app.services.simulation import SimulationService

settings = get_settings()

app = FastAPI(title=settings.app_name, version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(dashboard.router, prefix=settings.api_v1_prefix)
app.include_router(incidents.router, prefix=settings.api_v1_prefix)
app.include_router(resources.router, prefix=settings.api_v1_prefix)
app.include_router(assignments.router, prefix=settings.api_v1_prefix)
app.include_router(reports.router, prefix=settings.api_v1_prefix)
app.include_router(messages.router, prefix=settings.api_v1_prefix)
app.include_router(notifications.router, prefix=settings.api_v1_prefix)
app.include_router(live.router, prefix=settings.api_v1_prefix)
app.include_router(admin.router, prefix=settings.api_v1_prefix)
app.include_router(search.router, prefix=settings.api_v1_prefix)
app.include_router(simulation.router, prefix=settings.api_v1_prefix)


def _ensure_user_columns() -> None:
    with engine.begin() as connection:
        existing = {row[1] for row in connection.execute(text("PRAGMA table_info(users)"))}
        statements = []
        if "username" not in existing:
            statements.append("ALTER TABLE users ADD COLUMN username VARCHAR(255)")
        if "village" not in existing:
            statements.append("ALTER TABLE users ADD COLUMN village VARCHAR(255)")
        if "skills" not in existing:
            statements.append("ALTER TABLE users ADD COLUMN skills JSON")
        for statement in statements:
            connection.execute(text(statement))


async def _simulation_loop() -> None:
    while True:
        with SessionLocal() as db:
            service = SimulationService(db)
            state = service.current_state()
            interval = max(1, min(3, state.tick_interval_seconds))
            if state.is_running:
                service.step()
        await asyncio.sleep(interval)


@app.on_event("startup")
async def on_startup() -> None:
    if settings.environment == "test":
        return
    Base.metadata.create_all(bind=engine)
    _ensure_user_columns()
    with SessionLocal() as db:
        seed_database(db)
        simulation = SimulationService(db)
        state = simulation.ensure_state()
        if state.tick_interval_seconds > 3 or state.tick_interval_seconds < 1:
            state.tick_interval_seconds = 2
            db.commit()
        if simulation.current_weather() is None:
            simulation.step()
    app.state.simulation_task = asyncio.create_task(_simulation_loop())


@app.on_event("shutdown")
async def on_shutdown() -> None:
    task = getattr(app.state, "simulation_task", None)
    if task:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


@app.get("/")
def root() -> dict[str, object]:
    return {
        "name": settings.app_name,
        "status": "ok",
        "docs": "/docs",
        "healthz": "/healthz",
        "api": settings.api_v1_prefix,
    }
