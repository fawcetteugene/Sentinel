"""Authentication routes."""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import db_session, get_current_user, require_role
from app.core.security import Role, create_access_token, hash_password, verify_password
from app.models import User
from app.schemas import LoginRequest, Token, UserCreate, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(db_session)) -> Token:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(user.email, user.role.value)
    return Token(access_token=token)


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)


@router.post("/register", response_model=UserRead)
def register(
    payload: UserCreate,
    _: User = Depends(require_role(Role.ADMINISTRATOR)),
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
        phone_number=payload.phone_number,
        badge_id=payload.badge_id,
        avatar_url=payload.avatar_url,
        is_active=payload.is_active,
        is_on_duty=payload.is_on_duty,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)
