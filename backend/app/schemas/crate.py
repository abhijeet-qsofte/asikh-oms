# app/schemas/crate.py
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid


class GPSLocation(BaseModel):
    """Schema for GPS location data"""
    lat: float = Field(..., description="Latitude coordinate")
    lng: float = Field(..., description="Longitude coordinate")
    accuracy: Optional[float] = Field(None, description="Accuracy in meters")
    
    @validator('lat')
    def validate_latitude(cls, v):
        if v < -90 or v > 90:
            raise ValueError('Latitude must be between -90 and 90')
        return v
    
    @validator('lng')
    def validate_longitude(cls, v):
        if v < -180 or v > 180:
            raise ValueError('Longitude must be between -180 and 180')
        return v


class CrateBase(BaseModel):
    """Base schema for crate data"""
    qr_code: str
    weight: float = Field(..., gt=0, description="Weight in kg")
    supervisor_id: uuid.UUID
    variety_id: uuid.UUID
    notes: Optional[str] = None
    quality_grade: Optional[str] = Field(None, description="Quality grade (A, B, C, reject)")
    
    @validator('quality_grade')
    def validate_quality(cls, v):
        if v is not None:
            valid_grades = ['A', 'B', 'C', 'reject']
            if v not in valid_grades:
                raise ValueError(f'Quality grade must be one of {valid_grades}')
        return v


class CrateCreate(CrateBase):
    """Schema for creating a new crate record"""
    gps_location: GPSLocation
    photo_base64: Optional[str] = None  # Base64 encoded photo
    harvest_date: Optional[datetime] = None  # If None, server will use current time


class CrateUpdate(BaseModel):
    """Schema for updating an existing crate"""
    weight: Optional[float] = Field(None, gt=0)
    notes: Optional[str] = None
    quality_grade: Optional[str] = None
    batch_id: Optional[uuid.UUID] = None
    
    @validator('quality_grade')
    def validate_quality(cls, v):
        if v is not None:
            valid_grades = ['A', 'B', 'C', 'reject']
            if v not in valid_grades:
                raise ValueError(f'Quality grade must be one of {valid_grades}')
        return v


class CrateInDB(CrateBase):
    """Schema for crate information including DB fields"""
    id: uuid.UUID
    harvest_date: datetime
    gps_location: Dict[str, Any]
    photo_url: Optional[str] = None
    batch_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True  # Updated from orm_mode for Pydantic v2 compatibility


class CrateResponse(BaseModel):
    """Schema for crate information in responses"""
    id: uuid.UUID
    qr_code: str
    harvest_date: datetime
    gps_location: GPSLocation
    photo_url: Optional[str] = None
    supervisor_id: uuid.UUID
    supervisor_name: str  # Included from relationship
    weight: float
    notes: Optional[str] = None
    variety_id: uuid.UUID
    variety_name: str  # Included from relationship
    batch_id: Optional[uuid.UUID] = None
    batch_code: Optional[str] = None  # Included from relationship if batch exists
    quality_grade: Optional[str] = None
    
    class Config:
        from_attributes = True  # Updated from orm_mode for Pydantic v2 compatibility


class CrateList(BaseModel):
    """Schema for listing crates with pagination"""
    total: int
    page: int
    page_size: int
    crates: List[CrateResponse]


class CrateBatchAssign(BaseModel):
    """Schema for assigning a crate to a batch"""
    qr_code: str
    batch_id: uuid.UUID


class CrateSearch(BaseModel):
    """Schema for searching crates"""
    qr_code: Optional[str] = None
    variety_id: Optional[uuid.UUID] = None
    batch_id: Optional[uuid.UUID] = None
    supervisor_id: Optional[uuid.UUID] = None
    harvest_date_from: Optional[datetime] = None
    harvest_date_to: Optional[datetime] = None
    quality_grade: Optional[str] = None