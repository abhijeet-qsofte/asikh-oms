# app/schemas/qr_code.py
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
import uuid
import re

# QR code format pattern
QR_CODE_PATTERN = r"^ASIKH-(CRATE|BATCH)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"

class QRCodeBase(BaseModel):
    """Base schema for QR code data"""
    entity_type: str = Field("crate", description="Type of entity this QR code represents")
    status: str = Field("active", description="Status of the QR code")


class QRCodeCreate(QRCodeBase):
    """Schema for creating a new QR code"""
    code_value: Optional[str] = Field(None, description="Optional specific QR code value")
    prefix: str = Field("CRATE", description="Prefix for generated QR code")
    
    @validator("prefix")
    def validate_prefix(cls, v):
        allowed_prefixes = ["CRATE", "BATCH"]
        if v not in allowed_prefixes:
            raise ValueError(f"Prefix must be one of {allowed_prefixes}")
        return v
    
    @validator("status")
    def validate_status(cls, v):
        allowed_statuses = ["active", "used", "damaged", "retired"]
        if v not in allowed_statuses:
            raise ValueError(f"Status must be one of {allowed_statuses}")
        return v
    
    @validator("entity_type")
    def validate_entity_type(cls, v):
        allowed_types = ["crate", "batch", "farm", "packhouse"]
        if v not in allowed_types:
            raise ValueError(f"Entity type must be one of {allowed_types}")
        return v
    
    @validator("code_value")
    def validate_code_value(cls, v):
        if v is not None and not re.match(QR_CODE_PATTERN, v, re.IGNORECASE):
            raise ValueError(f"Invalid QR code format. Must match {QR_CODE_PATTERN}")
        return v


class QRCodeUpdate(BaseModel):
    """Schema for updating a QR code"""
    status: Optional[str] = None
    entity_type: Optional[str] = None
    
    @validator("status")
    def validate_status(cls, v):
        if v is not None:
            allowed_statuses = ["active", "used", "damaged", "retired"]
            if v not in allowed_statuses:
                raise ValueError(f"Status must be one of {allowed_statuses}")
        return v
    
    @validator("entity_type")
    def validate_entity_type(cls, v):
        if v is not None:
            allowed_types = ["crate", "batch", "farm", "packhouse"]
            if v not in allowed_types:
                raise ValueError(f"Entity type must be one of {allowed_types}")
        return v


class QRCodeResponse(BaseModel):
    """Schema for QR code response"""
    id: uuid.UUID
    code_value: str
    status: str
    entity_type: str
    created_at: datetime
    updated_at: datetime
    qr_image: Optional[str] = None  # Base64 encoded QR code image
    
    class Config:
        orm_mode = True


class QRCodeList(BaseModel):
    """Schema for listing QR codes with pagination"""
    total: int
    page: int
    page_size: int
    qr_codes: List[QRCodeResponse]


class QRCodeBatch(BaseModel):
    """Schema for generating a batch of QR codes"""
    count: int = Field(..., gt=0, le=1000, description="Number of QR codes to generate")
    prefix: str = Field("CRATE", description="Prefix for generated QR codes")
    entity_type: str = Field("crate", description="Type of entity these QR codes represent")
    
    @validator("prefix")
    def validate_prefix(cls, v):
        allowed_prefixes = ["CRATE", "BATCH"]
        if v not in allowed_prefixes:
            raise ValueError(f"Prefix must be one of {allowed_prefixes}")
        return v
    
    @validator("entity_type")
    def validate_entity_type(cls, v):
        allowed_types = ["crate", "batch", "farm", "packhouse"]
        if v not in allowed_types:
            raise ValueError(f"Entity type must be one of {allowed_types}")
        return v


class QRCodeDownload(BaseModel):
    """Schema for QR code download response"""
    download_path: str
    filename: str
    qr_count: int


class QRCodeValidation(BaseModel):
    """Schema for QR code validation response"""
    code_value: str
    valid_format: bool
    exists_in_database: bool
    status: Optional[str] = None