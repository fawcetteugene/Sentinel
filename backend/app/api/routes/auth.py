"""Authentication routes."""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import db_session, get_current_user, require_role
from app.core.security import Role, create_access_token, hash_password, verify_password
from app.models import User
from app.schemas import LoginRequest, Token, UserCreate, UserRead, UserUpdate
from app.services.operations import OperationsService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(db_session)) -> Token:
    identifier = (payload.identifier or payload.email or payload.phone_number or payload.username or "").strip()
    secret = payload.secret or payload.password or payload.pin or ""
    user = (
        db.query(User)
        .filter(
            (User.email == identifier)
            | (User.username == identifier)
            | (User.phone_number == identifier)
        )
        .first()
    )
    if not user or not user.is_active or not verify_password(secret, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token_subject = user.email or user.username or user.phone_number or str(user.id)
    token = create_access_token(token_subject, user.role.value)
    return Token(access_token=token)


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)


@router.patch("/me", response_model=UserRead)
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(db_session),
) -> UserRead:
    try:
        updated = OperationsService(db).update_user(current_user.id, payload.model_dump(exclude_unset=True))
        return UserRead.model_validate(updated)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/register", response_model=UserRead)
def register(
    payload: UserCreate,
    _: User = Depends(require_role(Role.COUNTY_ADMIN, Role.ADMINISTRATOR)),
    db: Session = Depends(db_session),
) -> UserRead:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="User already exists")
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=payload.role,
        username=payload.username,
        phone_number=payload.phone_number,
        village=payload.village,
        skills=payload.skills,
        badge_id=payload.badge_id,
        avatar_url=payload.avatar_url,
        is_active=payload.is_active,
        is_on_duty=payload.is_on_duty,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)
