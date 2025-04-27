# app/schemas/user.py
from pydantic import BaseModel, EmailStr, Field, validator, ConfigDict
from typing import Optional, List
from datetime import datetime
import uuid
import re


class UserBase(BaseModel):
    """Base user schema with common attributes"""
    username: str
    email: EmailStr
    role: str
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    
    @validator('role')
    def validate_role(cls, v):
        allowed_roles = ['admin', 'harvester', 'supervisor', 'packhouse']
        if v not in allowed_roles:
            raise ValueError(f'Role must be one of {allowed_roles}')
        return v
    
    @validator('phone_number')
    def validate_phone(cls, v):
        if v is not None:
            # Simple phone validation - can be enhanced based on requirements
            if not re.match(r'^\+?[0-9]{10,15}$', v):
                raise ValueError('Invalid phone number format')
        return v


class UserCreate(UserBase):
    """Schema for creating a new user"""
    password: str
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        return v


class UserUpdate(BaseModel):
    """Schema for updating an existing user"""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    role: Optional[str] = None
    active: Optional[bool] = None
    
    @validator('role')
    def validate_role(cls, v):
        if v is not None:
            allowed_roles = ['admin', 'harvester', 'supervisor', 'packhouse']
            if v not in allowed_roles:
                raise ValueError(f'Role must be one of {allowed_roles}')
        return v
    
    @validator('phone_number')
    def validate_phone(cls, v):
        if v is not None:
            if not re.match(r'^\+?[0-9]{10,15}$', v):
                raise ValueError('Invalid phone number format')
        return v


class UserPasswordChange(BaseModel):
    """Schema for changing a user's password"""
    current_password: str
    new_password: str
    
    @validator('new_password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        return v


class UserInDB(UserBase):
    """Schema for user information including DB fields"""
    id: uuid.UUID
    active: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class UserResponse(UserBase):
    """Schema for user information in responses"""
    id: uuid.UUID
    active: bool
    last_login: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class UserList(BaseModel):
    """Schema for listing users with pagination"""
    total: int
    page: int
    page_size: int
    users: List[UserResponse]