"""Simulation, weather, and system health routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import db_session, get_current_user, require_role
from app.core.security import Role
from app.models import User
from app.schemas import (
    RoadClosureRead,
    SimulationStateRead,
    SimulationWorldRead,
    SystemHealthRead,
    TimelineEventRead,
    WeatherSnapshotRead,
)
from app.services.simulation import SimulationService

router = APIRouter(prefix="/simulation", tags=["simulation"])


@router.get("/state", response_model=SimulationStateRead)
def state(_: User = Depends(get_current_user), db: Session = Depends(db_session)) -> SimulationStateRead:
    return SimulationStateRead.model_validate(SimulationService(db).current_state())


@router.post("/start", response_model=SimulationStateRead)
def start(_: User = Depends(require_role(Role.COUNTY_ADMIN, Role.ADMINISTRATOR)), db: Session = Depends(db_session)) -> SimulationStateRead:
    return SimulationStateRead.model_validate(SimulationService(db).start())


@router.post("/stop", response_model=SimulationStateRead)
def stop(_: User = Depends(require_role(Role.COUNTY_ADMIN, Role.ADMINISTRATOR)), db: Session = Depends(db_session)) -> SimulationStateRead:
    return SimulationStateRead.model_validate(SimulationService(db).stop())


@router.post("/step", response_model=dict)
def step(_: User = Depends(require_role(Role.COUNTY_ADMIN, Role.ADMINISTRATOR)), db: Session = Depends(db_session)) -> dict:
    return SimulationService(db).step()


@router.post("/reset", response_model=SimulationStateRead)
def reset(_: User = Depends(require_role(Role.COUNTY_ADMIN, Role.ADMINISTRATOR)), db: Session = Depends(db_session)) -> SimulationStateRead:
    return SimulationStateRead.model_validate(SimulationService(db).reset())


@router.post("/scenario/{scenario_name}", response_model=SimulationStateRead)
def scenario(scenario_name: str, _: User = Depends(require_role(Role.COUNTY_ADMIN, Role.ADMINISTRATOR)), db: Session = Depends(db_session)) -> SimulationStateRead:
    return SimulationStateRead.model_validate(SimulationService(db).set_scenario(scenario_name))


@router.post("/speed/{multiplier}", response_model=SimulationStateRead)
def speed(multiplier: int, _: User = Depends(require_role(Role.COUNTY_ADMIN, Role.ADMINISTRATOR)), db: Session = Depends(db_session)) -> SimulationStateRead:
    return SimulationStateRead.model_validate(SimulationService(db).set_speed(multiplier))


@router.get("/weather/current", response_model=WeatherSnapshotRead | None)
def current_weather(_: User = Depends(get_current_user), db: Session = Depends(db_session)) -> WeatherSnapshotRead | None:
    weather = SimulationService(db).current_weather()
    return WeatherSnapshotRead.model_validate(weather) if weather else None


@router.get("/weather/timeline", response_model=list[WeatherSnapshotRead])
def weather_timeline(_: User = Depends(get_current_user), db: Session = Depends(db_session)) -> list[WeatherSnapshotRead]:
    return [WeatherSnapshotRead.model_validate(item) for item in SimulationService(db).weather_timeline()]


@router.get("/closures", response_model=list[RoadClosureRead])
def closures(_: User = Depends(get_current_user), db: Session = Depends(db_session)) -> list[RoadClosureRead]:
    return [RoadClosureRead.model_validate(item) for item in SimulationService(db).road_closures()]


@router.get("/timeline", response_model=list[TimelineEventRead])
def timeline(_: User = Depends(get_current_user), db: Session = Depends(db_session)) -> list[TimelineEventRead]:
    return [TimelineEventRead.model_validate(item) for item in SimulationService(db).timeline()]


@router.get("/health", response_model=SystemHealthRead)
def health(_: User = Depends(get_current_user), db: Session = Depends(db_session)) -> SystemHealthRead:
    return SystemHealthRead.model_validate(SimulationService(db).system_health())


@router.get("/world", response_model=SimulationWorldRead | None)
def world(_: User = Depends(get_current_user), db: Session = Depends(db_session)) -> SimulationWorldRead | None:
    snapshot = SimulationService(db).current_world()
    return SimulationWorldRead.model_validate(SimulationService(db).world_dict(snapshot)) if snapshot else None
