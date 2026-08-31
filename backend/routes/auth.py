from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    require_admin,
    verify_password,
)
from backend.database import get_db
from backend.models import User, UserRole
from backend.schemas import (
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new standard user account",
)
def register_user(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a new standard user account.
    All public registrations are assigned the 'user' role.
    """
    # Check for existing email or username
    if db.query(User).filter(User.email == req.email.strip().lower()).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )
    if db.query(User).filter(User.username == req.username.strip()).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this username already exists.",
        )

    new_user = User(
        email=req.email.strip().lower(),
        username=req.username.strip(),
        hashed_password=hash_password(req.password),
        role=UserRole.USER.value,  # Only standard users can register
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive a JWT token",
)
def login_user(req: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates using either username or email and returns a signed JWT access token.
    """
    identifier = req.username_or_email.strip()
    user = (
        db.query(User)
        .filter((User.username == identifier) | (User.email == identifier.lower()))
        .first()
    )

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please check your username/email and password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive. Please contact administrator.",
        )

    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "user_id": user.id}
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        username=user.username,
        user_id=user.id,
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current logged in user profile and role",
)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Returns profile information and role for the currently logged-in user."""
    return current_user


@router.get(
    "/admin/users",
    response_model=List[UserResponse],
    summary="List all users (Admin privilege required)",
)
def list_all_users(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin-only endpoint returning all registered accounts."""
    return db.query(User).all()
