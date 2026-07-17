"""Global search routes."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import db_session, get_current_user
from app.models import User
from app.schemas import SearchResponse
from app.services.operations import OperationsService

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=SearchResponse)
def search(
    query: str = Query(min_length=1),
    kind: str | None = Query(default=None),
    _: User = Depends(get_current_user),
    db: Session = Depends(db_session),
) -> SearchResponse:
    return OperationsService(db).search(query=query, kind=kind)
