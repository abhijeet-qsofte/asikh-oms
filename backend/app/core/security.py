# app/core/security.py
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
from jose import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import uuid
import logging

from app.core.config import settings
from app.core.database import get_db_dependency
from app.models.user import User
from app.schemas.token import TokenPayload

# Configure logging
logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 token URL
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

def create_access_token(
    subject: Union[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token with optional expiration
    """
    # Always use UTC timezone explicitly
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Convert datetime objects to timestamps (seconds since epoch)
    # This ensures proper serialization for JWT
    to_encode = {
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
        "jti": str(uuid.uuid4()),  # unique token identifier
        "sub": str(subject),
        "type": "access",
    }
    
    logger.debug(f"Creating access token with exp: {to_encode['exp']} ({expire.isoformat()})")
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def create_refresh_token(
    subject: Union[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT refresh token with optional expiration
    """
    # Always use UTC timezone explicitly
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(
            minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES
        )
    
    # Convert datetime objects to timestamps (seconds since epoch)
    # This ensures proper serialization for JWT
    to_encode = {
        "exp": int(expire.timestamp()), 
        "iat": int(now.timestamp()),
        "sub": str(subject), 
        "type": "refresh"
    }
    
    logger.debug(f"Creating refresh token with exp: {to_encode['exp']} ({expire.isoformat()})")
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify if the provided password matches the hashed password
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Get a hash of the password
    """
    return pwd_context.hash(password)

def get_token_payload(token: str = Depends(oauth2_scheme)) -> TokenPayload:
    """
    Decode and validate the JWT token
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=["HS256"]
        )
        token_data = TokenPayload(**payload)
        
        if token_data.type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Since token_data.exp is already a timestamp (seconds since epoch),
        # we don't need to convert it, just compare with current time
        current_time = datetime.now(timezone.utc)
        current_timestamp = int(current_time.timestamp())
        
        # For debugging
        token_expiry = datetime.fromtimestamp(token_data.exp, tz=timezone.utc)
        
        if token_data.exp < current_timestamp:
            logger.warning(f"Token expired at {token_expiry.isoformat()}, current time is {current_time.isoformat()}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.debug(f"Token valid until {token_expiry.isoformat()}, current time is {current_time.isoformat()}")
        
        return token_data
    except jwt.JWTError as e:
        logger.error(f"JWT error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(
    db: Session = Depends(get_db_dependency),
    token_payload: TokenPayload = Depends(get_token_payload)
) -> User:
    """
    Get the current user from the token
    """
    try:
        user_id = uuid.UUID(token_payload.sub)
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        
        if not user.active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive user",
            )
            
        # Update last login time
        user.last_login = datetime.utcnow()
        db.commit()
        
        return user
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Check if the current user is active
    """
    if not current_user.active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# Role checking
def check_user_role(required_roles: list[str]):
    """
    Check if the current user has one of the required roles
    """
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {current_user.role} not authorized to perform this action",
            )
        return current_user
    return role_checker

#