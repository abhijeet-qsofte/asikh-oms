# app/schemas/farm.py
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, List, Any
from datetime import datetime
import uuid


class GPSCoordinates(BaseModel):
    """Schema for GPS coordinates"""
    lat: float = Field(..., description="Latitude coordinate")
    lng: float = Field(..., description="Longitude coordinate")
    
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


class ContactInfo(BaseModel):
    """Schema for contact information"""
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None


class FarmBase(BaseModel):
    """Base schema for farm data"""
    name: str = Field(..., min_length=2, max_length=100)
    location: Optional[str] = None
    gps_coordinates: Optional[GPSCoordinates] = None
    owner: Optional[str] = None
    contact_info: Optional[ContactInfo] = None


class FarmCreate(FarmBase):
    """Schema for creating a new farm"""
    pass


class FarmUpdate(BaseModel):
    """Schema for updating an existing farm"""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    location: Optional[str] = None
    gps_coordinates: Optional[GPSCoordinates] = None
    owner: Optional[str] = None
    contact_info: Optional[ContactInfo] = None


class FarmResponse(FarmBase):
    """Schema for farm information in responses"""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True  # Updated from orm_mode for Pydantic v2 compatibility


class FarmList(BaseModel):
    """Schema for listing farms with pagination"""
    total: int
    page: int
    page_size: int
    farms: List[FarmResponse]


class FarmStats(BaseModel):
    """Schema for farm statistics"""
    farm_id: uuid.UUID
    farm_name: str
    total_batches: int
    batch_status_counts: Dict[str, int]  # Status name to count mapping
    total_crates: int
    total_weight: float
    variety_distribution: Dict[str, int]  # Variety name to count mapping
    grade_distribution: Dict[str, int]  # Grade to count mapping
    packhouse_distribution: Dict[str, int]  # Packhouse name to count mapping