"""Message routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import db_session, get_current_user
from app.models import User
from app.schemas import MessageCreate, MessageRead
from app.services.operations import OperationsService

router = APIRouter(prefix="/messages", tags=["messages"])


@router.post("", response_model=MessageRead)
def create_message(
    payload: MessageCreate, current_user: User = Depends(get_current_user), db: Session = Depends(db_session)
) -> MessageRead:
    return MessageRead.model_validate(OperationsService(db).create_message(current_user, payload))

