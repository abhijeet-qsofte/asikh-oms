# app/api/dependencies.py
from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import logging

from app.core.database import get_db_dependency
from app.core.security import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"/api/auth/login")

# Dependency for getting the current active user
def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Check if the current user is active
    """
    if not current_user.active:
        logger.warning(f"Inactive user attempted access: {current_user.username}")
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# Dependency for checking user roles
def get_user_by_role(required_roles: list[str]):
    """
    Check if the current user has one of the required roles
    """
    async def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in required_roles:
            logger.warning(f"User {current_user.username} with role {current_user.role} attempted unauthorized access")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {current_user.role} not authorized to perform this action",
            )
        return current_user
    return role_checker

# Dependency for rate limiting
def rate_limiter(request: Request, db: Session = Depends(get_db_dependency)):
    """
    Basic rate limiting functionality
    Could be enhanced with Redis or other rate-limiting solutions
    """
    # Get client IP
    client_ip = request.client.host
    
    # In a real implementation, check IP against rate limits in Redis or similar
    # For now, we'll just log the request and proceed
    logger.debug(f"Request from {client_ip} to {request.url.path}")
    
    # Return to continue processing
    return True

# Dependency for request logging
def request_logger(request: Request):
    """
    Log all API requests
    """
    logger.info(f"Request {request.method} {request.url.path}")
    return