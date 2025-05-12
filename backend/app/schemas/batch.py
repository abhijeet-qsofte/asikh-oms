# app/schemas/batch.py
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid


class BatchBase(BaseModel):
    """Base schema for batch data"""
    supervisor_id: uuid.UUID
    transport_mode: str
    from_location: uuid.UUID
    to_location: uuid.UUID
    vehicle_number: Optional[str] = None
    driver_name: Optional[str] = None
    eta: Optional[datetime] = None
    notes: Optional[str] = None
    
    @validator('transport_mode')
    def validate_transport(cls, v):
        valid_modes = ['truck', 'van', 'bicycle', 'motorbike', 'other']
        if v not in valid_modes:
            raise ValueError(f'Transport mode must be one of {valid_modes}')
        return v


class BatchCreate(BatchBase):
    """Schema for creating a new batch"""
    batch_code: Optional[str] = None  # If None, server will generate one


class BatchUpdate(BaseModel):
    """Schema for updating an existing batch"""
    supervisor_id: Optional[uuid.UUID] = None
    transport_mode: Optional[str] = None
    vehicle_number: Optional[str] = None
    driver_name: Optional[str] = None
    eta: Optional[datetime] = None
    departure_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    
    @validator('transport_mode')
    def validate_transport(cls, v):
        if v is not None:
            valid_modes = ['truck', 'van', 'bicycle', 'motorbike', 'other']
            if v not in valid_modes:
                raise ValueError(f'Transport mode must be one of {valid_modes}')
        return v
    
    @validator('status')
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = ['open', 'in_transit', 'delivered', 'reconciled', 'closed']
            if v not in valid_statuses:
                raise ValueError(f'Status must be one of {valid_statuses}')
        return v


class BatchResponse(BaseModel):
    """Schema for batch information in responses"""
    id: uuid.UUID
    batch_code: str
    supervisor_id: uuid.UUID
    supervisor_name: str  # Included from relationship
    transport_mode: str
    from_location: uuid.UUID
    from_location_name: str  # Farm name from relationship
    to_location: uuid.UUID
    to_location_name: str  # Packhouse name from relationship
    vehicle_number: Optional[str] = None
    driver_name: Optional[str] = None
    eta: Optional[datetime] = None
    departure_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    status: str
    total_crates: int
    total_weight: float
    notes: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True  # Updated from orm_mode for Pydantic v2 compatibility


class BatchList(BaseModel):
    """Schema for listing batches with pagination"""
    total: int
    page: int
    page_size: int
    batches: List[BatchResponse]


class BatchCrateInfo(BaseModel):
    """Schema for crate information in batch responses"""
    id: uuid.UUID
    qr_code: str
    harvest_date: datetime
    supervisor_name: str
    weight: float
    variety_name: str
    reconciled: bool
    quality_grade: Optional[str] = None


class BatchInfoSummary(BaseModel):
    """Schema for batch summary information"""
    id: uuid.UUID
    batch_code: str
    status: str
    from_location_name: str
    to_location_name: str
    supervisor_name: str
    total_crates: int
    total_weight: float


class BatchCrateList(BaseModel):
    """Schema for listing crates in a batch"""
    batch: BatchInfoSummary
    total: int
    page: int
    page_size: int
    crates: List[BatchCrateInfo]


class BatchStatsResponse(BaseModel):
    """Schema for batch statistics"""
    batch_id: uuid.UUID
    batch_code: str
    status: str
    created_at: datetime
    supervisor_name: str
    from_location_name: str
    to_location_name: str
    departure_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    transit_time_minutes: Optional[float] = None
    total_crates: int
    total_weight: float
    reconciled_crates: int
    reconciliation_percentage: float
    is_fully_reconciled: bool
    variety_distribution: Dict[str, int]  # variety name -> count
    grade_distribution: Dict[str, int]  # grade -> count