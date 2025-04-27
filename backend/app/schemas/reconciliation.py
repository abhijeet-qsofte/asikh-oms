# app/schemas/reconciliation.py
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from app.schemas.crate import GPSLocation


class DeviceInfo(BaseModel):
    """Schema for device information"""
    model: Optional[str] = None
    platform: Optional[str] = None
    os_version: Optional[str] = None
    app_version: Optional[str] = None
    device_id: Optional[str] = None


class ReconciliationScan(BaseModel):
    """Schema for a reconciliation scan request"""
    qr_code: str
    batch_id: uuid.UUID
    location: Optional[GPSLocation] = None
    device_info: Optional[DeviceInfo] = None
    notes: Optional[str] = None


class ReconciliationResponse(BaseModel):
    """Schema for a reconciliation scan response"""
    id: uuid.UUID
    qr_code: str
    batch_id: uuid.UUID
    batch_code: str
    status: str
    timestamp: datetime
    scanned_by_id: uuid.UUID
    scanned_by_name: str
    crate_info: Optional[Dict[str, Any]] = None  # Basic crate details if found
    
    class Config:
        orm_mode = True


class ReconciliationLogInDB(BaseModel):
    """Schema for reconciliation log information including DB fields"""
    id: uuid.UUID
    batch_id: uuid.UUID
    scanned_qr: str
    crate_id: Optional[uuid.UUID] = None
    status: str
    timestamp: datetime
    scanned_by_id: uuid.UUID
    location: Optional[Dict[str, Any]] = None
    device_info: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    
    class Config:
        orm_mode = True


class ReconciliationList(BaseModel):
    """Schema for listing reconciliation logs with pagination"""
    total: int
    page: int
    page_size: int
    logs: List[ReconciliationResponse]


class BatchReconciliationSummary(BaseModel):
    """Schema for batch reconciliation summary"""
    batch_id: uuid.UUID
    batch_code: str
    total_crates: int
    scanned_crates: int
    matched: int
    mismatched: int
    missing: List[str]  # List of QR codes not scanned
    wrong_batch: List[Dict[str, Any]]  # List of crates from wrong batch
    duplicates: int
    total_weight: float
    reconciliation_status: str
    reconciliation_progress: float  # Percentage
    last_scan: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ReconciliationSearch(BaseModel):
    """Schema for searching reconciliation logs"""
    batch_id: Optional[uuid.UUID] = None
    qr_code: Optional[str] = None
    status: Optional[str] = None
    scanned_by_id: Optional[uuid.UUID] = None
    timestamp_from: Optional[datetime] = None
    timestamp_to: Optional[datetime] = None


class ReconciliationStats(BaseModel):
    """Schema for reconciliation statistics"""
    total_batches: int
    total_reconciled: int
    total_in_progress: int
    total_pending: int
    total_crates: int
    total_scanned: int
    reconciliation_rate: float  # Percentage
    average_time_per_scan: float  # In seconds
    daily_scans: Dict[str, int]  # Date to count for the last 7 days
    reconciliation_by_status: Dict[str, int]  # Status to count