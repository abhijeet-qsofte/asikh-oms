# app/api/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import logging
from datetime import datetime, timedelta
import uuid

from app.core.database import get_db_dependency
from app.core.security import (
    create_access_token, 
    create_refresh_token, 
    verify_password, 
    get_password_hash
)
from app.core.config import settings
from app.models.user import User
from app.schemas.authentication import (
    LoginRequest, 
    LoginResponse, 
    RefreshTokenRequest, 
    RefreshTokenResponse,
    PasswordResetRequest,
    PasswordResetVerify,
    PinLoginRequest,
    SetPinRequest,
    SetPinResponse
)
from app.schemas.token import TokenPayload
from jose import jwt, JWTError

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/login", response_model=LoginResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db_dependency)
):
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    # Find the user by username
    user = db.query(User).filter(User.username == form_data.username).first()
    
    # Check if user exists and password is correct
    if not user or not verify_password(form_data.password, user.password):
        logger.warning(f"Failed login attempt for username: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.active:
        logger.warning(f"Login attempt for inactive user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )
    
    # Create access and refresh tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        subject=str(user.id), expires_delta=refresh_token_expires
    )
    
    # Update last login time
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Log the successful login
    logger.info(f"User {user.username} logged in successfully")
    
    # Return tokens and user info
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_at=int((datetime.utcnow() + access_token_expires).timestamp()),
        user_id=str(user.id),
        username=user.username,
        role=user.role,
        min_mobile_app_version=settings.MIN_MOBILE_APP_VERSION,
        force_upgrade_version=settings.FORCE_UPGRADE_VERSION
    )

@router.post("/login/mobile", response_model=LoginResponse)
async def mobile_login(
    login_data: LoginRequest,
    db: Session = Depends(get_db_dependency)
):
    """
    Mobile-friendly login that accepts JSON payload instead of form data
    """
    # Find the user by username
    user = db.query(User).filter(User.username == login_data.username).first()
    
    # Check if user exists and password is correct
    if not user or not verify_password(login_data.password, user.password):
        logger.warning(f"Failed mobile login attempt for username: {login_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.active:
        logger.warning(f"Mobile login attempt for inactive user: {login_data.username}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )
    
    # Create access and refresh tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        subject=str(user.id), expires_delta=refresh_token_expires
    )
    
    # Update last login time
    user.last_login = datetime.utcnow()
    
    # Optionally store device info if provided
    if login_data.device_info:
        # In a real app, you might store this in a user_devices table
        logger.info(f"Device info for user {user.username}: {login_data.device_info}")
    
    db.commit()
    
    # Log the successful login
    logger.info(f"User {user.username} logged in successfully via mobile")
    
    # Return tokens and user info
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_at=int((datetime.utcnow() + access_token_expires).timestamp()),
        user_id=str(user.id),
        username=user.username,
        role=user.role,
        min_mobile_app_version=settings.MIN_MOBILE_APP_VERSION,
        force_upgrade_version=settings.FORCE_UPGRADE_VERSION
    )

@router.post("/login/pin", response_model=LoginResponse)
async def pin_login(
    login_data: PinLoginRequest,
    db: Session = Depends(get_db_dependency)
):
    """
    PIN-based login for mobile app that accepts a username and PIN
    """
    try:
        # Find the user by username
        user = db.query(User).filter(User.username == login_data.username).first()
        
        # Check if user exists and has a PIN set
        if not user:
            logger.warning(f"Failed PIN login attempt - User not found: {login_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # If PIN is not set, check if we're in bypass mode
        if not user.pin:
            from app.core.bypass_auth import BYPASS_AUTHENTICATION
            if BYPASS_AUTHENTICATION:
                logger.warning(f"PIN not set for user {login_data.username}, but authentication is bypassed")
            else:
                logger.warning(f"Failed PIN login attempt - PIN not set: {login_data.username}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="PIN not set for this user",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        # If PIN is set, verify it
        elif not verify_password(login_data.pin, user.pin):
            logger.warning(f"Failed PIN login attempt - Incorrect PIN: {login_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect PIN",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if user is active
        if not user.active:
            logger.warning(f"PIN login attempt for inactive user: {login_data.username}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive user account",
            )
        
        # Create access and refresh tokens
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires = timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
        
        access_token = create_access_token(
            subject=str(user.id), expires_delta=access_token_expires
        )
        refresh_token = create_refresh_token(
            subject=str(user.id), expires_delta=refresh_token_expires
        )
        
        # Update last login time
        user.last_login = datetime.utcnow()
        
        # Optionally store device info if provided
        if login_data.device_info:
            # In a real app, you might store this in a user_devices table
            logger.info(f"Device info for user {user.username}: {login_data.device_info}")
        
        db.commit()
        
        # Log the successful login
        logger.info(f"User {user.username} logged in successfully via PIN")
        
        # Return tokens and user info
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_at=int((datetime.utcnow() + access_token_expires).timestamp()),
            user_id=str(user.id),
            username=user.username,
            role=user.role,
            min_mobile_app_version=settings.MIN_MOBILE_APP_VERSION,
            force_upgrade_version=settings.FORCE_UPGRADE_VERSION
        )
    except Exception as e:
        # Log the error for debugging
        logger.error(f"Error in PIN login: {str(e)}")
        # Re-raise the exception if it's an HTTPException
        if isinstance(e, HTTPException):
            raise
        # Otherwise, return a generic error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error during PIN login: {str(e)}"
        )

@router.post("/set-pin", response_model=SetPinResponse)
async def set_pin(
    request: SetPinRequest,
    db: Session = Depends(get_db_dependency)
):
    """
    Set or update a user's PIN after verifying their password
    """
    try:
        # Find the user by username
        user = db.query(User).filter(User.username == request.username).first()
        
        # Check if user exists
        if not user:
            logger.warning(f"Failed set PIN attempt - User not found: {request.username}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        
        # Check if we're in bypass mode
        from app.core.bypass_auth import BYPASS_AUTHENTICATION
        
        # Verify the password (skip if in bypass mode)
        if not BYPASS_AUTHENTICATION and not verify_password(request.password, user.password):
            logger.warning(f"Failed set PIN attempt - Incorrect password: {request.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if user is active
        if not user.active:
            logger.warning(f"Set PIN attempt for inactive user: {request.username}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive user account",
            )
        
        # Set the PIN (hashed)
        user.pin = get_password_hash(request.pin)
        user.pin_set_at = datetime.utcnow()
        
        # Commit the changes
        db.commit()
        
        # Log the successful PIN set
        logger.info(f"PIN set successfully for user {request.username}")
        
        # Return success response
        return SetPinResponse(
            success=True,
            message="PIN set successfully",
            username=user.username
        )
    except Exception as e:
        # Log the error for debugging
        logger.error(f"Error in set_pin: {str(e)}")
        # Re-raise the exception if it's an HTTPException
        if isinstance(e, HTTPException):
            raise
        # Otherwise, return a generic error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error during PIN setup: {str(e)}"
        )

@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db_dependency)
):
    """
    Refresh access token using a valid refresh token
    """
    try:
        # Decode and validate the refresh token
        payload = jwt.decode(
            request.refresh_token, settings.SECRET_KEY, algorithms=["HS256"]
        )
        token_data = TokenPayload(**payload)
        
        # Check token type
        if token_data.type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if token is expired
        if datetime.fromtimestamp(token_data.exp) < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get the user from the database
        user_id = token_data.sub
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user or not user.active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user or inactive account",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create new tokens
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires = timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
        
        access_token = create_access_token(
            subject=str(user.id), expires_delta=access_token_expires
        )
        new_refresh_token = create_refresh_token(
            subject=str(user.id), expires_delta=refresh_token_expires
        )
        
        # Log the token refresh
        logger.info(f"Tokens refreshed for user {user.username}")
        
        return RefreshTokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_at=int((datetime.utcnow() + access_token_expires).timestamp())
        )
        
    except JWTError as e:
        logger.error(f"JWT error during token refresh: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.post("/password-reset", status_code=status.HTTP_202_ACCEPTED)
async def request_password_reset(
    request: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db_dependency)
):
    """
    Request a password reset for a user
    """
    # Find the user by email
    user = db.query(User).filter(User.email == request.email).first()
    
    # Always return success to prevent email enumeration attacks
    if not user:
        logger.warning(f"Password reset requested for non-existent email: {request.email}")
        return {"message": "If the email exists, a password reset link will be sent"}
    
    # Generate a password reset token
    reset_token_expires = timedelta(hours=24)
    reset_token = create_access_token(
        subject=str(user.id), 
        expires_delta=reset_token_expires
    )
    
    # Add background task to send email
    # In a real implementation, this would send an email with the reset token
    # background_tasks.add_task(send_password_reset_email, user.email, reset_token)
    
    logger.info(f"Password reset requested for user: {user.username}")
    
    return {"message": "If the email exists, a password reset link will be sent"}

@router.post("/password-reset/verify", status_code=status.HTTP_200_OK)
async def verify_password_reset(
    request: PasswordResetVerify,
    db: Session = Depends(get_db_dependency)
):
    """
    Verify a password reset token and set a new password
    """
    try:
        # Decode and validate the token
        payload = jwt.decode(
            request.token, settings.SECRET_KEY, algorithms=["HS256"]
        )
        token_data = TokenPayload(**payload)
        
        # Check if token is expired
        if datetime.fromtimestamp(token_data.exp) < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
            )
        
        # Get the user from the database
        user_id = token_data.sub
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        
        # Update the password
        user.password = get_password_hash(request.new_password)
        db.commit()
        
        logger.info(f"Password reset successful for user: {user.username}")
        
        return {"message": "Password has been reset successfully"}
        
    except JWTError as e:
        logger.error(f"JWT error during password reset: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout():
    """
    Logout endpoint
    
    Note: JWT tokens can't be invalidated server-side without additional infrastructure.
    This endpoint is mainly for client-side cleanup.
    For a more secure implementation, we'd need a token blacklist using Redis or similar.
    """
    return {"message": "Successfully logged out"}