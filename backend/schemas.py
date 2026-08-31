from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class UserRoleEnum(str, Enum):
    admin = "admin"
    user = "user"


class UserRegisterRequest(BaseModel):
    email: str = Field(..., description="User email address")
    username: str = Field(..., min_length=3, max_length=50, description="Username for login")
    password: str = Field(..., min_length=6, description="Password (at least 6 chars)")


class UserLoginRequest(BaseModel):
    username_or_email: str = Field(..., description="Username or email address")
    password: str = Field(..., description="Account password")


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    role: str
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    user_id: int


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
