# app/schemas/packhouse.py
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


class PackhouseBase(BaseModel):
    """Base schema for packhouse data"""
    name: str = Field(..., min_length=2, max_length=100)
    location: Optional[str] = None
    gps_coordinates: Optional[GPSCoordinates] = None
    manager: Optional[str] = None
    contact_info: Optional[ContactInfo] = None


class PackhouseCreate(PackhouseBase):
    """Schema for creating a new packhouse"""
    pass


class PackhouseUpdate(BaseModel):
    """Schema for updating an existing packhouse"""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    location: Optional[str] = None
    gps_coordinates: Optional[GPSCoordinates] = None
    manager: Optional[str] = None
    contact_info: Optional[ContactInfo] = None


class PackhouseResponse(PackhouseBase):
    """Schema for packhouse information in responses"""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True  # Updated from orm_mode for Pydantic v2 compatibility


class PackhouseList(BaseModel):
    """Schema for listing packhouses with pagination"""
    total: int
    page: int
    page_size: int
    packhouses: List[PackhouseResponse]


class PackhouseStats(BaseModel):
    """Schema for packhouse statistics"""
    packhouse_id: uuid.UUID
    packhouse_name: str
    total_batches: int
    batch_status_counts: Dict[str, int]  # Status name to count mapping
    total_crates: int
    reconciled_crates: int
    reconciliation_rate: float  # Percentage
    total_weight: float
    variety_distribution: Dict[str, int]  # Variety name to count mapping
    grade_distribution: Dict[str, int]  # Grade to count mapping
    farm_distribution: Dict[str, int]  # Farm name to count mapping
    reconciliation_status_distribution: Dict[str, int]  # Status to count mapping