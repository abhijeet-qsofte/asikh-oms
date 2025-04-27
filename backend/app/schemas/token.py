# app/schemas/token.py
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

class TokenPayload(BaseModel):
    """Schema for JWT token payload structure"""
    sub: str  # Subject (usually user ID)
    exp: int  # Expiration time (Unix timestamp)
    type: Literal["access", "refresh"] = "access"  # Token type
    iat: Optional[int] = None  # Issued at time (Unix timestamp)
    jti: Optional[str] = None  # JWT ID (unique identifier for this token)
    
    @property
    def expired(self) -> bool:
        """Check if token is expired"""
        return datetime.utcnow().timestamp() > self.exp


class TokenData(BaseModel):
    """Schema for decoded token data with user information"""
    user_id: str
    token_type: Literal["access", "refresh"]
    expires_at: datetime


class RefreshTokenRequest(BaseModel):
    """Schema for refresh token request"""
    refresh_token: str
    device_id: Optional[str] = None


class TokenResponse(BaseModel):
    """Schema for token response after login or refresh"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_at: int  # Unix timestamp when access token expires