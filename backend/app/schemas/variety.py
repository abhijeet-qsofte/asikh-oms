# app/schemas/variety.py
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, List
from datetime import datetime
import uuid


class VarietyBase(BaseModel):
    """Base schema for mango variety data"""
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None


class VarietyCreate(VarietyBase):
    """Schema for creating a new mango variety"""
    pass


class VarietyUpdate(BaseModel):
    """Schema for updating an existing mango variety"""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None


class VarietyResponse(VarietyBase):
    """Schema for variety information in responses"""
    id: uuid.UUID
    created_at: datetime

    # enable .from_orm() on Pydantic v2
    model_config = ConfigDict(from_attributes=True)


class VarietyList(BaseModel):
    """Schema for listing varieties with pagination"""
    total: int
    page: int
    page_size: int
    varieties: List[VarietyResponse]


class VarietyStats(BaseModel):
    """Schema for variety statistics"""
    variety_id: uuid.UUID
    variety_name: str
    total_crates: int
    total_weight: float
    average_weight: float
    grade_distribution: Dict[str, int]  # Grade to count mapping
    farm_distribution: Dict[str, int]  # Farm name to count mapping
    packhouse_distribution: Dict[str, int]  # Packhouse name to count mapping
    harvest_distribution: Dict[str, int]  # Month (YYYY-MM) to count mapping