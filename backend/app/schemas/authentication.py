# app/schemas/auth.py
from pydantic import BaseModel, Field
from typing import Optional


class LoginRequest(BaseModel):
    """Schema for login request"""
    username: str
    password: str
    device_id: Optional[str] = None
    device_info: Optional[dict] = None


class LoginResponse(BaseModel):
    """Schema for login response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_at: int  # Unix timestamp
    user_id: str
    username: str
    role: str
    min_mobile_app_version: str
    force_upgrade_version: str


class RefreshTokenRequest(BaseModel):
    """Schema for refresh token request"""
    refresh_token: str
    device_id: Optional[str] = None


class RefreshTokenResponse(BaseModel):
    """Schema for refresh token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_at: int  # Unix timestamp


class PasswordResetRequest(BaseModel):
    """Schema for password reset request"""
    email: str


class PasswordResetVerify(BaseModel):
    """Schema for password reset verification"""
    token: str
    new_password: str