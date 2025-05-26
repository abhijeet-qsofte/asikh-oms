# app/api/routes/users.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from sqlalchemy.exc import IntegrityError
import uuid
import logging
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db_dependency
from app.core.config import settings
from app.core.security import (
    get_current_user, 
    get_password_hash, 
    verify_password,
    check_user_role
)
from app.core.bypass_auth import get_bypass_user, check_bypass_role
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserList,
    UserPasswordChange
)
from pydantic import BaseModel
from typing import List as TypeList

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_user)
):
    """
    Get current user information
    """
    return current_user

@router.get("/", response_model=UserList)
async def get_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: Optional[str] = None,
    active: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin"]))
):
    """
    Get all users with pagination and filtering
    Admin only endpoint
    """
    # Start building the query
    query = db.query(User)
    
    # Apply filters
    if role:
        query = query.filter(User.role == role)
    
    if active is not None:
        query = query.filter(User.active == active)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.username.ilike(search_term)) |
            (User.email.ilike(search_term)) |
            (User.full_name.ilike(search_term))
        )
    
    # Count total matching users
    total_count = query.count()
    
    # Apply pagination and fetch users
    users = query.order_by(User.username)\
                .offset((page - 1) * page_size)\
                .limit(page_size)\
                .all()
    
    return UserList(
        total=total_count,
        page=page,
        page_size=page_size,
        users=users
    )

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin"]))
):
    """
    Get a user by ID
    """
    # Only allow admin to see other users, or users to see themselves
    if current_user.role != "admin" and str(current_user.id) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this user information"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin"]))
):
    """
    Create a new user
    Admin only endpoint
    """
    try:
        # Check if username already exists
        existing_username = db.query(User).filter(User.username == user_data.username).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already exists"
            )
        
        # Check if email already exists
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists"
            )
        
        # Create new user
        hashed_password = get_password_hash(user_data.password)
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            password=hashed_password,
            role=user_data.role,
            full_name=user_data.full_name,
            phone_number=user_data.phone_number,
            active=True,
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        logger.info(f"User {new_user.username} created by {current_user.username}")
        
        return new_user
    
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Database integrity error creating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User creation failed due to constraint violation"
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating the user"
        )

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    user_data: UserUpdate,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    Update a user's information
    Admins can update any user, users can only update themselves
    """
    # Only allow admin to update other users, or users to update themselves
    if current_user.role != "admin" and str(current_user.id) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user"
        )
    
    # Find the user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    try:
        # Update email if provided and different
        if user_data.email is not None and user_data.email != user.email:
            # Check if email already exists
            existing_email = db.query(User).filter(User.email == user_data.email).first()
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email already exists"
                )
            user.email = user_data.email
        
        # Update fields if provided
        if user_data.full_name is not None:
            user.full_name = user_data.full_name
        
        if user_data.phone_number is not None:
            user.phone_number = user_data.phone_number
        
        # Only admins can update role and active status
        if current_user.role == "admin":
            if user_data.role is not None:
                user.role = user_data.role
            
            if user_data.active is not None:
                user.active = user_data.active
        
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        
        logger.info(f"User {user.username} updated by {current_user.username}")
        
        return user
    
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Database integrity error updating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User update failed due to constraint violation"
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating the user"
        )

@router.patch("/{user_id}/activate", response_model=UserResponse)
async def activate_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin"]))
):
    """
    Activate a user
    Admin only endpoint
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.active = True
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    logger.info(f"User {user.username} activated by {current_user.username}")
    
    return user

@router.patch("/{user_id}/deactivate", response_model=UserResponse)
async def deactivate_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin"]))
):
    """
    Deactivate a user
    Admin only endpoint
    """
    # Prevent deactivating yourself
    if str(current_user.id) == str(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate yourself"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.active = False
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    logger.info(f"User {user.username} deactivated by {current_user.username}")
    
    return user

@router.post("/password", status_code=status.HTTP_200_OK)
async def change_password(
    password_data: UserPasswordChange,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    Change the current user's password
    """
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    # Update password
    current_user.password = get_password_hash(password_data.new_password)
    current_user.updated_at = datetime.utcnow()
    db.commit()
    
    logger.info(f"Password changed for user {current_user.username}")
    
    return {"message": "Password updated successfully"}

@router.post("/{user_id}/reset-password", response_model=UserResponse)
async def admin_reset_password(
    user_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin"]))
):
    """
    Reset a user's password to a generated temporary password
    Admin only endpoint
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Generate a random temporary password
    import secrets
    import string
    temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
    
    # Update password
    user.password = get_password_hash(temp_password)
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    logger.info(f"Password reset for user {user.username} by {current_user.username}")
    
    # Return the user and temporary password
    return {
        **user.__dict__,
        "temporary_password": temp_password
    }


# Role management schemas
class RoleList(BaseModel):
    roles: TypeList[str]


class RoleCreate(BaseModel):
    role: str


@router.get("/roles", response_model=RoleList)
async def get_roles(
    current_user: User = Depends(get_user)
):
    """
    Get all available roles in the system
    """
    return {"roles": settings.ALLOWED_ROLES}


@router.post("/roles", response_model=RoleList, status_code=status.HTTP_201_CREATED)
async def add_role(
    role_data: RoleCreate,
    current_user: User = Depends(check_role(["admin"]))
):
    """
    Add a new role to the system
    Admin only endpoint
    """
    # Check if role already exists
    if role_data.role in settings.ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Role already exists"
        )
    
    # Add the new role
    settings.ALLOWED_ROLES.append(role_data.role)
    
    logger.info(f"New role '{role_data.role}' added by {current_user.username}")
    
    return {"roles": settings.ALLOWED_ROLES}


@router.delete("/roles/{role_name}", response_model=RoleList)
async def delete_role(
    role_name: str,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin"]))
):
    """
    Delete a role from the system
    Admin only endpoint
    """
    # Check if role exists
    if role_name not in settings.ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Check if role is in use
    users_with_role = db.query(User).filter(User.role == role_name).count()
    if users_with_role > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete role '{role_name}' as it is assigned to {users_with_role} users"
        )
    
    # Check if it's the admin role
    if role_name == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the 'admin' role as it is a system role"
        )
    
    # Remove the role
    settings.ALLOWED_ROLES.remove(role_name)
    
    logger.info(f"Role '{role_name}' deleted by {current_user.username}")
    
    return {"roles": settings.ALLOWED_ROLES}