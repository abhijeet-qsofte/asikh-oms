# app/schemas/dispatch.py
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
import uuid


class BatchDispatchData(BaseModel):
    """Schema for dispatching a batch"""
    vehicle_type: str = Field(..., description="Type of vehicle used for dispatch")
    driver_name: str = Field(..., description="Name of the driver")
    eta: datetime = Field(..., description="Estimated time of arrival")
    photo_url: Optional[str] = None
    notes: Optional[str] = None
    
    @validator('vehicle_type')
    def validate_vehicle_type(cls, v):
        valid_types = ['truck', 'van', 'bicycle', 'motorbike', 'other']
        if v not in valid_types:
            raise ValueError(f'Vehicle type must be one of {valid_types}')
        return v
