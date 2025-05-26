# app/api/routes/batches.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from typing import Optional, List, Dict
import uuid
import logging
from datetime import datetime

from app.core.database import get_db_dependency
from app.core.security import get_current_user, check_user_role
from app.core.bypass_auth import get_bypass_user, check_bypass_role, BYPASS_AUTHENTICATION

# Use bypass authentication based on the environment variable
get_user = get_bypass_user if BYPASS_AUTHENTICATION else get_current_user
check_role = check_bypass_role if BYPASS_AUTHENTICATION else check_user_role
from app.models.user import User
from app.models.batch import Batch
from app.models.crate import Crate
from app.models.farm import Farm
from app.models.packhouse import Packhouse
from app.models.reconciliation import ReconciliationLog, CrateReconciliation
from app.models.variety import Variety
from collections import defaultdict
from app.schemas.batch import (
    BatchCreate,
    BatchUpdate,
    BatchResponse,
    BatchList,
    BatchStatsResponse,
    BatchCrateList
)

router = APIRouter()
logger = logging.getLogger(__name__)

# Helper function to get reconciliation status for a batch
def get_reconciliation_status(batch_id, batch, db=None):
    if batch.status != "delivered":
        return None
        
    try:
        # Get total crates in batch
        total_crates = batch.total_crates or 0
        
        if db is None:
            return f"0/{total_crates} crates (0%)"
        
        # Get reconciled crates count from the database
        reconciled_crates = db.query(func.count(CrateReconciliation.id)).filter(
            CrateReconciliation.batch_id == batch_id,
            CrateReconciliation.status.in_(["matched", "damaged", "missing"])
        ).scalar() or 0
        
        # Calculate percentage
        percentage = (reconciled_crates / total_crates * 100) if total_crates > 0 else 0
        
        return f"{reconciled_crates}/{total_crates} crates ({percentage:.1f}%)"
    except Exception as e:
        logger.error(f"Error getting reconciliation status: {str(e)}")
        return "Error"

@router.get("/{batch_id}/reconciliation", response_model=Dict[str, str])
async def get_batch_reconciliation_status(
    batch_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    Get reconciliation status for a batch
    """
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )
    
    if batch.status != "delivered":
        return {"status": "Batch not delivered yet"}
    
    # Get total crates in batch
    total_crates = batch.total_crates or 0
    
    # Get reconciled crates by status
    status_counts = {}
    for status_type in ["matched", "damaged", "missing"]:
        count = db.query(func.count(CrateReconciliation.id)).filter(
            CrateReconciliation.batch_id == batch_id,
            CrateReconciliation.status == status_type
        ).scalar() or 0
        status_counts[status_type] = count
    
    # Calculate total reconciled
    total_reconciled = sum(status_counts.values())
    
    # Calculate percentage
    percentage = (total_reconciled / total_crates * 100) if total_crates > 0 else 0
    
    # Format the response
    response = {
        "total_crates": str(total_crates),
        "total_reconciled": str(total_reconciled),
        "percentage": f"{percentage:.1f}%",
        "matched": str(status_counts.get("matched", 0)),
        "damaged": str(status_counts.get("damaged", 0)),
        "missing": str(status_counts.get("missing", 0)),
        "status": f"{total_reconciled}/{total_crates} crates ({percentage:.1f}%)"
    }
    
    return response

@router.post("/", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
async def create_batch(
    batch_data: BatchCreate,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin", "supervisor", "manager"]))
):
    """
    Create a new batch
    """
    # Check if supervisor exists
    supervisor = db.query(User).filter(User.id == batch_data.supervisor_id).first()
    if not supervisor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supervisor not found"
        )
    
    # Check if from_location (farm) exists
    farm = db.query(Farm).filter(Farm.id == batch_data.from_location).first()
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Farm not found"
        )
    
    # Check if to_location (packhouse) exists
    packhouse = db.query(Packhouse).filter(Packhouse.id == batch_data.to_location).first()
    if not packhouse:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Packhouse not found"
        )
    
    # Generate batch code
    today = datetime.now().strftime("%Y%m%d")
    
    # Get the count of batches created today
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    batch_count = db.query(func.count(Batch.id)).filter(Batch.created_at >= today_start).scalar() or 0
    
    # Format: BATCH-YYYYMMDD-NNN
    batch_code = f"BATCH-{today}-{(batch_count + 1):03d}"
    
    # Create new batch
    new_batch = Batch(
        batch_code=batch_code,
        supervisor_id=batch_data.supervisor_id,
        transport_mode=batch_data.transport_mode,
        from_location=batch_data.from_location,
        to_location=batch_data.to_location,
        vehicle_number=batch_data.vehicle_number,
        driver_name=batch_data.driver_name,
        eta=batch_data.eta,
        status="open",
        total_crates=0,
        total_weight=0.0,
        notes=batch_data.notes
    )
    
    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)
    
    return {
        "id": new_batch.id,
        "batch_code": new_batch.batch_code,
        "supervisor_id": new_batch.supervisor_id,
        "supervisor_name": supervisor.full_name or supervisor.username,
        "transport_mode": new_batch.transport_mode,
        "from_location": new_batch.from_location,
        "from_location_name": farm.name,
        "to_location": new_batch.to_location,
        "to_location_name": packhouse.name,
        "vehicle_number": new_batch.vehicle_number,
        "driver_name": new_batch.driver_name,
        "eta": new_batch.eta,
        "departure_time": new_batch.departure_time,
        "arrival_time": new_batch.arrival_time,
        "status": new_batch.status,
        "total_crates": new_batch.total_crates,
        "total_weight": new_batch.total_weight,
        "notes": new_batch.notes,
        "created_at": new_batch.created_at
    }

@router.get("/{batch_id}", response_model=BatchResponse)
async def get_batch(
    batch_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    Get a batch by ID
    """
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )
    
    # Get related entities with null checks
    supervisor = None
    farm = None
    packhouse = None
    
    if batch.supervisor_id is not None:
        supervisor = db.query(User).filter(User.id == batch.supervisor_id).first()
    
    if batch.from_location is not None:
        farm = db.query(Farm).filter(Farm.id == batch.from_location).first()
    
    if batch.to_location is not None:
        packhouse = db.query(Packhouse).filter(Packhouse.id == batch.to_location).first()
    
    return {
        "id": batch.id,
        "batch_code": batch.batch_code,
        "supervisor_id": batch.supervisor_id,
        "supervisor_name": supervisor.full_name or supervisor.username if supervisor else "Unknown",
        "transport_mode": batch.transport_mode,
        "from_location": batch.from_location,
        "from_location_name": farm.name if farm else "Unknown",
        "to_location": batch.to_location,
        "to_location_name": packhouse.name if packhouse else "Unknown",
        "vehicle_number": batch.vehicle_number,
        "driver_name": batch.driver_name,
        "eta": batch.eta,
        "departure_time": batch.departure_time,
        "arrival_time": batch.arrival_time,
        "status": batch.status,
        "total_crates": batch.total_crates,
        "total_weight": batch.total_weight,
        "notes": batch.notes,
        "created_at": batch.created_at,
        "reconciliation_status": get_reconciliation_status(batch_id, batch, db)
    }
