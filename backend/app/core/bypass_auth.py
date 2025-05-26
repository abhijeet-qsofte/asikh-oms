# app/core/bypass_auth.py
from typing import List
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging

from app.core.database import get_db_dependency
from app.models.user import User

# Configure logging
logger = logging.getLogger(__name__)

# Global flag to control authentication bypass
BYPASS_AUTHENTICATION = True

async def get_bypass_user(
    db: Session = Depends(get_db_dependency),
) -> User:
    """
    Bypass authentication and return an admin user
    This should only be used for development/testing
    """
    if not BYPASS_AUTHENTICATION:
        # If bypass is disabled, raise an exception
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get or create an admin user to use for all requests
    admin_user = db.query(User).filter(User.username == "admin").first()
    
    if not admin_user:
        logger.warning("Admin user not found in bypass_auth - authentication will fail")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin user not found",
        )
    
    logger.info("⚠️ AUTHENTICATION BYPASSED - Using admin user for all requests ⚠️")
    return admin_user

def check_bypass_role(required_roles: List[str] = None):
    """
    Bypass role checking and always return an admin user
    This should only be used for development/testing
    """
    async def bypass_role_dependency(
        db: Session = Depends(get_db_dependency),
    ) -> User:
        return await get_bypass_user(db)
    
    return bypass_role_dependency
