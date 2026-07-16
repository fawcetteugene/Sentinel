"""Dashboard routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import db_session, get_current_user
from app.models import User
from app.schemas import AnalyticsSummary, DashboardSummary, AICommanderResponse
from app.services.operations import OperationsService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def summary(_: User = Depends(get_current_user), db: Session = Depends(db_session)) -> DashboardSummary:
    return OperationsService(db).dashboard()


@router.get("/analytics", response_model=AnalyticsSummary)
def analytics(_: User = Depends(get_current_user), db: Session = Depends(db_session)) -> AnalyticsSummary:
    return OperationsService(db).analytics()


@router.get("/commander", response_model=AICommanderResponse)
def commander(_: User = Depends(get_current_user), db: Session = Depends(db_session)) -> AICommanderResponse:
    return OperationsService(db).commander_briefing()

