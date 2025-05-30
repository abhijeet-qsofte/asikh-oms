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

# Define valid batch status transitions
VALID_BATCH_TRANSITIONS = {
    "open": ["in_transit", "arrived"],
    "in_transit": ["arrived"],
    "arrived": ["delivered"],
    "delivered": ["closed"],
    "closed": []
}

# Default weight for crates if not specified
DEFAULT_CRATE_WEIGHT = 1.0

# Helper function to validate batch status transitions
def validate_batch_transition(current_status, new_status):
    """Validate if a batch status transition is allowed"""
    if new_status not in VALID_BATCH_TRANSITIONS.get(current_status, []):
        allowed = VALID_BATCH_TRANSITIONS.get(current_status, [])
        allowed_str = ", ".join(allowed) if allowed else "none"
        return False, f"Cannot transition batch from '{current_status}' to '{new_status}'. Allowed transitions: {allowed_str}"
    return True, ""
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
from app.schemas.crate import CrateMinimalCreate, CrateResponse
from app.models.qr_code import QRCode

router = APIRouter(prefix="/batches", tags=["batches"])
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
            CrateReconciliation.is_reconciled == True
        ).scalar() or 0

        # Calculate reconciliation percentage
        percentage = (reconciled_crates / total_crates * 100) if total_crates > 0 else 0

        # Format the reconciliation status
        return f"{reconciled_crates}/{total_crates} crates ({int(percentage)}%)"
    except Exception as e:
        logger.error(f"Error getting reconciliation stats: {str(e)}")
        return f"0/{total_crates} crates (0%)"

@router.get("/{batch_id}/reconciliation-status", response_model=dict)
async def get_batch_reconciliation_status(
    batch_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    Get reconciliation status for a batch
    """
    try:
        # Find the batch
        batch = db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )

        # Get reconciliation status text
        reconciliation_status = get_reconciliation_status(batch_id, batch, db)

        is_fully_reconciled = False

        # Only delivered batches can be reconciled
        if batch.status == "delivered":
            # Get total crates in batch
            total_crates = db.query(func.count(Crate.id)).filter(Crate.batch_id == batch_id).scalar() or 0

            # Get reconciled crates count from the database
            reconciled_crates = db.query(func.count(CrateReconciliation.id)).filter(
                CrateReconciliation.batch_id == batch_id,
                CrateReconciliation.is_reconciled == True
            ).scalar() or 0

            # Check if all crates are reconciled
            is_fully_reconciled = reconciled_crates == total_crates and total_crates > 0

        # Get total and reconciled crates count from the database
        total_crates = db.query(func.count(Crate.id)).filter(Crate.batch_id == batch_id).scalar() or 0

        # Get detailed information about crates in this batch
        crates_in_batch = db.query(Crate).filter(Crate.batch_id == batch_id).all()
        crate_ids = [str(crate.id) for crate in crates_in_batch]
        crate_qr_codes = [crate.qr_code for crate in crates_in_batch]

        logger.info(f"Crates in batch {batch_id}: {crate_ids}")
        logger.info(f"QR codes in batch {batch_id}: {crate_qr_codes}")

        # Get reconciled crates with detailed information
        reconciled_records = db.query(CrateReconciliation).filter(
            CrateReconciliation.batch_id == batch_id,
            CrateReconciliation.is_reconciled == True
        ).all()

        reconciled_qr_codes = [rec.qr_code for rec in reconciled_records]
        reconciled_crate_ids = [str(rec.crate_id) for rec in reconciled_records]

        logger.info(f"Reconciled QR codes for batch {batch_id}: {reconciled_qr_codes}")
        logger.info(f"Reconciled crate IDs for batch {batch_id}: {reconciled_crate_ids}")

        reconciled_count = len(reconciled_records)

        # Return the reconciliation status
        return {
            "batch_id": str(batch_id),
            "batch_code": batch.batch_code,
            "status": batch.status,
            "reconciliation_status": reconciliation_status,
            "is_fully_reconciled": is_fully_reconciled,
            "total_crates": total_crates,
            "reconciled_count": reconciled_count
        }
    except Exception as e:
        # Log the error
        logger.error(f"Error getting reconciliation status: {str(e)}")
        # Return a 500 error with details
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while getting reconciliation status: {str(e)}"
        )

@router.post("/", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
async def create_batch(
    batch_data: BatchCreate,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin", "supervisor", "manager"]))
):
    """
    Create a new batch
    """
    try:
        # Verify the supervisor exists
        supervisor = db.query(User).filter(User.id == batch_data.supervisor_id).first()
        if not supervisor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Supervisor with ID {batch_data.supervisor_id} not found"
            )

        # Verify the farm exists - this is mandatory
        farm = db.query(Farm).filter(Farm.id == batch_data.from_location).first()
        if not farm:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Farm with ID {batch_data.from_location} not found"
            )

        # Verify the packhouse exists if provided
        packhouse = None
        if batch_data.to_location:
            packhouse = db.query(Packhouse).filter(Packhouse.id == batch_data.to_location).first()
            if not packhouse:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Packhouse with ID {batch_data.to_location} not found"
                )

        # Generate batch code if not provided
        if not batch_data.batch_code:
            # Format: BATCH-{YYYYMMDD}-{sequential number}
            date_str = datetime.utcnow().strftime("%Y%m%d")

            # Find the max batch number for today
            latest_batch = db.query(Batch).filter(
                Batch.batch_code.like(f"BATCH-{date_str}-%")
            ).order_by(desc(Batch.batch_code)).first()

            if latest_batch:
                # Extract the number and increment
                try:
                    batch_num = int(latest_batch.batch_code.split('-')[-1]) + 1
                except ValueError:
                    batch_num = 1
            else:
                batch_num = 1

            batch_code = f"BATCH-{date_str}-{batch_num:03d}"
        else:
            batch_code = batch_data.batch_code

            # Check if batch code already exists
            existing_batch = db.query(Batch).filter(Batch.batch_code == batch_code).first()
            if existing_batch:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Batch with code {batch_code} already exists"
                )

        # Create new batch
        new_batch = Batch(
            batch_code=batch_code,
            supervisor_id=batch_data.supervisor_id,
            from_location=batch_data.from_location,
            transport_mode=batch_data.transport_mode,
            to_location=batch_data.to_location,
            vehicle_number=batch_data.vehicle_number,
            driver_name=batch_data.driver_name,
            eta=batch_data.eta,
            photo_url=batch_data.photo_url,
            latitude=batch_data.latitude if batch_data.latitude is not None else 0.0,
            longitude=batch_data.longitude if batch_data.longitude is not None else 0.0,
            notes=batch_data.notes,
            status="open",
            total_crates=0,
            total_weight=0  # Initialize with zero, will be calculated as crates are added
        )

        db.add(new_batch)
        db.commit()
        db.refresh(new_batch)

        logger.info(f"Batch {batch_code} created by user {current_user.username}")

        # Prepare response with additional information
        return {
            "id": new_batch.id,
            "batch_code": new_batch.batch_code,
            "supervisor_id": new_batch.supervisor_id,
            "supervisor_name": supervisor.full_name or supervisor.username,
            "transport_mode": new_batch.transport_mode,
            "from_location": new_batch.from_location,
            "from_location_name": farm.name,
            "to_location": new_batch.to_location,
            "to_location_name": packhouse.name if packhouse else None,
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

    except HTTPException as e:
        # Re-raise HTTP exceptions
        raise

    except Exception as e:
        logger.error(f"Error creating batch: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating the batch: {str(e)}"
        )

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

    # Get related entities
    supervisor = db.query(User).filter(User.id == batch.supervisor_id).first()
    farm = db.query(Farm).filter(Farm.id == batch.from_location).first()
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
        "photo_url": batch.photo_url,
        "latitude": batch.latitude if hasattr(batch, "latitude") else 0.0,
        "longitude": batch.longitude if hasattr(batch, "longitude") else 0.0,
        "notes": batch.notes,
        "created_at": batch.created_at
    }

@router.get("/code/{batch_code}", response_model=BatchResponse)
async def get_batch_by_code(
    batch_code: str,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    Get a batch by batch code
    """
    batch = db.query(Batch).filter(Batch.batch_code == batch_code).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch with code {batch_code} not found"
        )

    # Get related entities
    supervisor = db.query(User).filter(User.id == batch.supervisor_id).first()
    farm = db.query(Farm).filter(Farm.id == batch.from_location).first()
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
        "photo_url": batch.photo_url,
        "latitude": batch.latitude if hasattr(batch, "latitude") else 0.0,
        "longitude": batch.longitude if hasattr(batch, "longitude") else 0.0,
        "notes": batch.notes,
        "created_at": batch.created_at
    }

@router.get("/", response_model=BatchList)
async def list_batches(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    from_location: Optional[uuid.UUID] = None,
    to_location: Optional[uuid.UUID] = None,
    supervisor_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    List all batches with pagination and filtering
    """
    # Build query with filters
    query = db.query(Batch)

    if status:
        query = query.filter(Batch.status == status)

    if from_date:
        query = query.filter(Batch.created_at >= from_date)

    if to_date:
        query = query.filter(Batch.created_at <= to_date)

    if from_location:
        query = query.filter(Batch.from_location == from_location)

    if to_location:
        query = query.filter(Batch.to_location == to_location)

    if supervisor_id:
        query = query.filter(Batch.supervisor_id == supervisor_id)

    # Count total matching batches
    total_count = query.count()

    # Apply pagination
    batches = query.order_by(desc(Batch.created_at))\
                  .offset((page - 1) * page_size)\
                  .limit(page_size)\
                  .all()

    # Prepare response items with related data
    result_items = []
    for batch in batches:
        # Get related entities
        supervisor = db.query(User).filter(User.id == batch.supervisor_id).first()
        farm = db.query(Farm).filter(Farm.id == batch.from_location).first()
        packhouse = db.query(Packhouse).filter(Packhouse.id == batch.to_location).first()

        # Get reconciliation stats for the batch if it's delivered or closed
        weight_differential = None
        weight_loss_percentage = None
        reconciliation_status = None

        if batch.status in ['delivered', 'closed']:
            # Get total crates in batch
            total_crates = db.query(func.count(Crate.id)).filter(Crate.batch_id == batch.id).scalar() or 0

            # Get reconciled crates count from the database
            reconciled_crates = db.query(func.count(CrateReconciliation.id)).filter(
                CrateReconciliation.batch_id == batch.id,
                CrateReconciliation.is_reconciled == True
            ).scalar() or 0

            # Calculate reconciliation percentage
            reconciliation_percentage = round((reconciled_crates / total_crates * 100) if total_crates > 0 else 0, 2)
            reconciliation_status = f"{reconciled_crates}/{total_crates} ({reconciliation_percentage}%)"

            # Get weight statistics
            total_original_weight = db.query(func.sum(Crate.weight)).filter(Crate.batch_id == batch.id).scalar() or 0
            total_reconciled_weight = db.query(func.sum(CrateReconciliation.weight)).filter(
                CrateReconciliation.batch_id == batch.id,
                CrateReconciliation.is_reconciled == True
            ).scalar() or 0

            # Check if there are any reconciled crates
            reconciled_crates_count = db.query(func.count(CrateReconciliation.id)).filter(
                CrateReconciliation.batch_id == batch.id,
                CrateReconciliation.is_reconciled == True
            ).scalar() or 0

            if reconciled_crates_count > 0:
                # Get the weight differential from the database
                total_weight_differential = db.query(func.sum(CrateReconciliation.weight_differential)).filter(
                    CrateReconciliation.batch_id == batch.id,
                    CrateReconciliation.is_reconciled == True
                ).scalar()

                # If the database doesn't have the differential (older records), calculate it
                if total_weight_differential is None:
                    total_weight_differential = total_reconciled_weight - total_original_weight

                weight_differential = round(total_weight_differential, 2)

                # Calculate the percentage only if there's original weight
                if total_original_weight > 0:
                    weight_loss_percentage = round((total_weight_differential / total_original_weight * 100), 2)
                else:
                    weight_loss_percentage = 0
            else:
                weight_differential = 0
                weight_loss_percentage = 0

        result_items.append({
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
            "weight_differential": weight_differential,
            "weight_loss_percentage": weight_loss_percentage,
            "photo_url": batch.photo_url,
            "latitude": batch.latitude if hasattr(batch, "latitude") else 0.0,
            "longitude": batch.longitude if hasattr(batch, "longitude") else 0.0,
            "reconciliation_status": reconciliation_status,
            "notes": batch.notes,
            "created_at": batch.created_at
        })

    return {
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "batches": result_items
    }

@router.put("/{batch_id}", response_model=BatchResponse)
async def update_batch(
    batch_id: uuid.UUID,
    batch_data: BatchUpdate,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin", "supervisor", "manager"]))
):
    """
    Update a batch
    """
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )

    try:
        # Update fields if provided
        if batch_data.supervisor_id is not None:
            # Verify supervisor exists
            supervisor = db.query(User).filter(User.id == batch_data.supervisor_id).first()
            if not supervisor:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Supervisor with ID {batch_data.supervisor_id} not found"
                )
            batch.supervisor_id = batch_data.supervisor_id

        if batch_data.transport_mode is not None:
            batch.transport_mode = batch_data.transport_mode

        if batch_data.vehicle_number is not None:
            batch.vehicle_number = batch_data.vehicle_number

        if batch_data.driver_name is not None:
            batch.driver_name = batch_data.driver_name

        if batch_data.eta is not None:
            batch.eta = batch_data.eta

        if batch_data.departure_time is not None:
            batch.departure_time = batch_data.departure_time

            # If setting departure time, also update status to in_transit if currently open
            if batch.status == "open":
                batch.status = "in_transit"

        if batch_data.arrival_time is not None:
            batch.arrival_time = batch_data.arrival_time

            # If setting arrival time, also update status to delivered if currently in_transit
            if batch.status == "in_transit":
                batch.status = "delivered"

        if batch_data.status is not None:
            # Validate status transitions using the helper function
            is_valid, error_message = validate_batch_transition(batch.status, batch_data.status)
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=error_message
                )

            # Handle automatic timestamp updates
            if batch_data.status == "in_transit" and batch.status == "open":
                if batch.departure_time is None:
                    batch.departure_time = datetime.utcnow()

            if batch_data.status == "arrived" and batch.status in ["open", "in_transit"]:
                if batch.arrival_time is None:
                    batch.arrival_time = datetime.utcnow()

            # Role-based permissions for status changes
            if batch_data.status == "delivered" and current_user.role not in ["admin", "packhouse", "manager"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins, packhouse users, or managers can mark a batch as delivered"
                )

            # Special case for closed - only admin or packhouse can close a batch
            if batch_data.status == "closed" and current_user.role not in ["admin", "packhouse"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins or packhouse users can close a batch"
                )

            # Update the status
            batch.status = batch_data.status

        if batch_data.notes is not None:
            batch.notes = batch_data.notes

        db.commit()
        db.refresh(batch)

        logger.info(f"Batch {batch.batch_code} updated by user {current_user.username}")

        # Get related entities for response
        supervisor = db.query(User).filter(User.id == batch.supervisor_id).first()
        farm = db.query(Farm).filter(Farm.id == batch.from_location).first()
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
            "created_at": batch.created_at
        }

    except HTTPException as e:
        # Re-raise HTTP exceptions
        raise

    except Exception as e:
        logger.error(f"Error updating batch: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating the batch: {str(e)}"
        )

@router.patch("/{batch_id}/depart", response_model=BatchResponse)
async def mark_batch_departed(
    batch_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin", "supervisor", "manager"]))
):
    """
    Mark a batch as departed (in_transit)
    """
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )

    if batch.status != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot mark departure for batch with status '{batch.status}'"
        )

    # Check if required fields for dispatch are present
    if not batch.transport_mode:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transport mode is required to dispatch a batch"
        )

    if not batch.to_location:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Destination (to_location) is required to dispatch a batch"
        )

    # Update batch
    batch.status = "in_transit"
    batch.departure_time = datetime.utcnow()
    db.commit()
    db.refresh(batch)

    logger.info(f"Batch {batch.batch_code} marked as departed by user {current_user.username}")

    # Get related entities for response
    supervisor = db.query(User).filter(User.id == batch.supervisor_id).first()
    farm = db.query(Farm).filter(Farm.id == batch.from_location).first()
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
        "created_at": batch.created_at
    }

@router.patch("/{batch_id}/arrive", response_model=BatchResponse)
async def mark_batch_arrived(
    batch_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin", "supervisor", "manager", "packhouse"]))
):
    """
    Mark a batch as arrived at the packhouse (but not yet delivered/reconciled)
    """
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )

    if batch.status not in ["open", "in_transit"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot mark arrival for batch with status '{batch.status}'"
        )

    # Update batch - use 'arrived' status instead of 'delivered'
    batch.status = "arrived"
    batch.arrival_time = datetime.utcnow()

    # If departure was not recorded, record it now
    if batch.departure_time is None:
        batch.departure_time = batch.arrival_time

    logger.info(f"Batch {batch.batch_code} marked as ARRIVED by user {current_user.username}. Ready for reconciliation.")

    db.commit()
    db.refresh(batch)

    logger.info(f"Batch {batch.batch_code} marked as arrived by user {current_user.username}")

    # Get related entities for response
    supervisor = db.query(User).filter(User.id == batch.supervisor_id).first()
    farm = db.query(Farm).filter(Farm.id == batch.from_location).first()
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
        "created_at": batch.created_at
    }

@router.get("/{batch_id}/crates", response_model=BatchCrateList)
async def get_batch_crates(
    batch_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    Get all crates in a batch
    """
    # Verify batch exists
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )

    # Query crates
    crates_query = db.query(Crate).filter(Crate.batch_id == batch_id)

    # Count total crates
    total_count = crates_query.count()

    # Apply pagination
    crates = crates_query.offset((page - 1) * page_size).limit(page_size).all()

    # Get batch information
    supervisor = db.query(User).filter(User.id == batch.supervisor_id).first()
    farm = db.query(Farm).filter(Farm.id == batch.from_location).first()
    packhouse = db.query(Packhouse).filter(Packhouse.id == batch.to_location).first()

    # Batch info
    batch_info = {
        "id": batch.id,
        "batch_code": batch.batch_code,
        "status": batch.status,
        "from_location_name": farm.name if farm else "Unknown",
        "to_location_name": packhouse.name if packhouse else "Unknown",
        "supervisor_name": supervisor.full_name or supervisor.username if supervisor else "Unknown",
        "total_crates": batch.total_crates,
        "total_weight": batch.total_weight
    }

    # Prepare crate data
    crate_items = []
    for crate in crates:
        # Get crate supervisor
        crate_supervisor = db.query(User).filter(User.id == crate.supervisor_id).first()

        # Check if crate has been reconciled
        reconciled = db.query(ReconciliationLog).filter(
            and_(
                ReconciliationLog.batch_id == batch_id,
                ReconciliationLog.scanned_qr == crate.qr_code,
                ReconciliationLog.status == "matched"
            )
        ).first() is not None

        crate_items.append({
            "id": crate.id,
            "qr_code": crate.qr_code,
            "harvest_date": crate.harvest_date,
            "supervisor_name": crate_supervisor.full_name or crate_supervisor.username if crate_supervisor else "Unknown",
            "weight": crate.weight,
            "variety_name": crate.variety_obj.name if crate.variety_obj else "Unknown",
            "reconciled": reconciled,
            "quality_grade": crate.quality_grade
        })

    return {
        "batch": batch_info,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "crates": crate_items
    }

@router.get("/{batch_id}/stats", response_model=BatchStatsResponse)
async def get_batch_stats(
    batch_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    Get statistics for a batch
    """
    # Verify batch exists
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )

    # Get crate statistics
    crate_count = db.query(func.count(Crate.id)).filter(Crate.batch_id == batch_id).scalar()

    # Get variety distribution
    variety_counts = db.query(
        Crate.variety_id,
        func.count(Crate.id).label('count')
    ).filter(
        Crate.batch_id == batch_id
    ).group_by(
        Crate.variety_id
    ).all()

    # Get quality grade distribution
    grade_counts = db.query(
        Crate.quality_grade,
        func.count(Crate.id).label('count')
    ).filter(
        Crate.batch_id == batch_id
    ).group_by(
        Crate.quality_grade
    ).all()

    # Get reconciliation status
    reconciled_count = db.query(func.count(ReconciliationLog.id)).filter(
        and_(
            ReconciliationLog.batch_id == batch_id,
            ReconciliationLog.status == "matched"
        )
    ).scalar()

    # Calculate reconciliation percentage
    reconciliation_percentage = (reconciled_count / crate_count * 100) if crate_count > 0 else 0

    # Determine if batch is fully reconciled
    is_fully_reconciled = reconciled_count == crate_count if crate_count > 0 else False

    # Format variety distribution with names
    variety_distribution = {}
    for variety_id, count in variety_counts:
        variety = db.query(Variety).filter(Variety.id == variety_id).first()
        variety_name = variety.name if variety else "Unknown"
        variety_distribution[variety_name] = count

    # Format quality grade distribution
    grade_distribution = {}
    for grade, count in grade_counts:
        grade_distribution[grade or "Ungraded"] = count

    # Get timing information
    transit_time = None
    if batch.departure_time and batch.arrival_time:
        transit_time = (batch.arrival_time - batch.departure_time).total_seconds() / 60  # in minutes

    # Get batch basic info
    supervisor = db.query(User).filter(User.id == batch.supervisor_id).first()
    farm = db.query(Farm).filter(Farm.id == batch.from_location).first()
    packhouse = db.query(Packhouse).filter(Packhouse.id == batch.to_location).first()

    return {
        "batch_id": batch.id,
        "batch_code": batch.batch_code,
        "status": batch.status,
        "created_at": batch.created_at,
        "supervisor_name": supervisor.full_name or supervisor.username if supervisor else "Unknown",
        "from_location_name": farm.name if farm else "Unknown",
        "to_location_name": packhouse.name if packhouse else "Unknown",
        "departure_time": batch.departure_time,
        "arrival_time": batch.arrival_time,
        "transit_time_minutes": transit_time,
        "total_crates": crate_count,
        "total_weight": batch.total_weight,
        "reconciled_crates": reconciled_count,
        "reconciliation_percentage": reconciliation_percentage,
        "is_fully_reconciled": is_fully_reconciled,
        "variety_distribution": variety_distribution,
        "grade_distribution": grade_distribution,
        "photo_url": batch.photo_url
    }


@router.post("/{batch_id}/add-crate", response_model=BatchResponse)
async def add_crate_to_batch(
    batch_id: uuid.UUID,
    crate_data: dict,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin", "supervisor", "manager"]))
):
    """
    Add a crate to a batch
    """
    # Extract QR code or crate_id from request body
    qr_code = crate_data.get('qr_code')
    crate_id = crate_data.get('crate_id')
    
    if not qr_code and not crate_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either QR code or crate ID is required"
        )
        
    # Verify batch exists
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )
    
    # Check if batch is in valid state for adding crates
    if batch.status not in ["open"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot add crates to batch with status '{batch.status}'"
        )
    
    # Find the crate by QR code or ID
    if qr_code:
        crate = db.query(Crate).filter(Crate.qr_code == qr_code).first()
    else:
        crate = db.query(Crate).filter(Crate.id == crate_id).first()
    if not crate:
        error_detail = f"Crate with QR code {qr_code} not found" if qr_code else f"Crate with ID {crate_id} not found"
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_detail
        )
    
    # Check if crate is already in a batch
    if crate.batch_id is not None:
        # If already in this batch, return success
        if crate.batch_id == batch_id:
            return await get_batch(batch_id, db, current_user)
        
        # If in another batch, raise error
        existing_batch = db.query(Batch).filter(Batch.id == crate.batch_id).first()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Crate already assigned to batch {existing_batch.batch_code}"
        )
    
    # Add crate to batch
    crate.batch_id = batch_id
    
    # Set farm_id on crate if not already set
    if crate.farm_id is None:
        crate.farm_id = batch.from_location
        logger.info(f"Farm ID {batch.from_location} set on crate {crate.qr_code} from batch {batch.batch_code}")
    
    # Update batch statistics
    batch.total_crates += 1
    batch.total_weight += crate.weight
    
    db.commit()
    
    logger.info(f"Crate {qr_code} added to batch {batch.batch_code} by user {current_user.username}")
    
    # Return updated batch
    return await get_batch(batch_id, db, current_user)


@router.post("/{batch_id}/add-minimal-crate", response_model=BatchResponse)
async def add_minimal_crate_to_batch(
    batch_id: uuid.UUID,
    crate_data: CrateMinimalCreate,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin", "supervisor", "manager"]))
):
    """
    Add a crate to a batch with minimal information (QR code and variety ID)
    """
    # Verify batch exists
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )
    
    # Check if batch is in valid state for adding crates
    if batch.status not in ["open"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot add crates to batch with status '{batch.status}'"
        )
    
    # Check if QR code exists
    qr_code = crate_data.qr_code
    crate = db.query(Crate).filter(Crate.qr_code == qr_code).first()
    
    # If crate doesn't exist, create it
    if not crate:
        # Create new crate with minimal information
        crate = Crate(
            qr_code=qr_code,
            variety_id=crate_data.variety_id,
            weight=crate_data.weight,  # Will default to 1.0 if not provided
            supervisor_id=crate_data.supervisor_id or current_user.id,
            farm_id=crate_data.farm_id or batch.from_location,
            notes=crate_data.notes,
            batch_id=batch_id
        )
        db.add(crate)
        logger.info(f"New crate created with QR code {qr_code} and added to batch {batch.batch_code}")
    else:
        # Check if crate is already in a batch
        if crate.batch_id is not None:
            # If already in this batch, return success
            if crate.batch_id == batch_id:
                return await get_batch(batch_id, db, current_user)
            
            # If in another batch, raise error
            existing_batch = db.query(Batch).filter(Batch.id == crate.batch_id).first()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Crate already assigned to batch {existing_batch.batch_code}"
            )
        
        # Update crate with new information
        crate.variety_id = crate_data.variety_id
        crate.weight = crate_data.weight
        crate.supervisor_id = crate_data.supervisor_id or current_user.id
        crate.farm_id = crate_data.farm_id or batch.from_location
        if crate_data.notes:
            crate.notes = crate_data.notes
        crate.batch_id = batch_id
        logger.info(f"Existing crate with QR code {qr_code} updated and added to batch {batch.batch_code}")
    
    # Update batch statistics
    batch.total_crates += 1
    batch.total_weight += crate.weight
    
    db.commit()
    
    logger.info(f"Minimal crate {qr_code} added to batch {batch.batch_code} by user {current_user.username}")
    
    # Return updated batch
    return await get_batch(batch_id, db, current_user)


@router.post("/{batch_id}/reconcile", response_model=dict)
async def reconcile_crate(
    batch_id: uuid.UUID,
    crate_data: dict,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin", "supervisor", "manager", "packhouse"]))
):
    """
    Reconcile a crate with a batch
    """
    try:
        # Extract data from request body
        qr_code = crate_data.get('qr_code')
        photo_url = crate_data.get('photo_url')
        weight = crate_data.get('weight')
        
        # Validate required fields
        if not qr_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="QR code is required"
            )
            
        # Validate weight if provided
        if weight is not None:
            try:
                weight = float(weight)
                if weight <= 0:
                    raise ValueError("Weight must be positive")
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Weight must be a positive number"
                )
        else:
            # Weight is required for loss calculation
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Weight is required for reconciliation"
            )
            
        # Set photo_url to None if not provided
        if photo_url is None:
            photo_url = None  # Explicit assignment for clarity
            
        # Verify batch exists
        batch = db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )
        
        # Check if batch is in valid state for reconciliation
        if batch.status not in ["arrived", "delivered"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot reconcile crates for batch with status '{batch.status}'. Batch must be arrived or delivered."
            )
        
        # Find the crate
        crate = db.query(Crate).filter(Crate.qr_code == qr_code).first()
        if not crate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Crate with QR code {qr_code} not found"
            )
        
        # Check if crate is in this batch
        if crate.batch_id != batch_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Crate {qr_code} is not assigned to this batch"
            )
        
        # Get batch ID as string
        batch_id_str = str(batch_id)
        
        # Store the reconciliation in the database
        now = datetime.utcnow()
        
        # Check if this crate has already been reconciled
        existing_reconciliation = db.query(CrateReconciliation).filter(
            CrateReconciliation.batch_id == batch_id,
            CrateReconciliation.qr_code == qr_code
        ).first()
        
        if existing_reconciliation:
            # Update existing reconciliation
            existing_reconciliation.weight = weight
            
            # Calculate weight differential (reconciliation weight - original weight)
            original_weight = crate.weight
            weight_differential = weight - original_weight if original_weight is not None else None
            
            existing_reconciliation.original_weight = original_weight
            existing_reconciliation.weight_differential = weight_differential
            existing_reconciliation.photo_url = photo_url
            existing_reconciliation.reconciled_by_id = current_user.id
            existing_reconciliation.reconciled_at = now
        else:
            # Create new reconciliation record
            # Calculate weight differential (reconciliation weight - original weight)
            original_weight = crate.weight
            weight_differential = weight - original_weight if original_weight is not None else None
            
            new_reconciliation = CrateReconciliation(
                batch_id=batch_id,
                crate_id=crate.id,
                crate_harvest_date=crate.harvest_date,
                qr_code=qr_code,
                reconciled_by_id=current_user.id,
                reconciled_at=now,
                weight=weight,
                original_weight=original_weight,
                weight_differential=weight_differential,
                photo_url=photo_url,
                is_reconciled=True
            )
            db.add(new_reconciliation)
        
        # Commit the changes
        db.commit()
        
        logger.info(f"Crate {qr_code} reconciled with batch {batch.batch_code} by user {current_user.username}")
        
        # Get total crates in batch
        total_crates = db.query(func.count(Crate.id)).filter(Crate.batch_id == batch_id).scalar() or 0
        
        # Get reconciled crates count from the database
        reconciled_crates = db.query(func.count(CrateReconciliation.id)).filter(
            CrateReconciliation.batch_id == batch_id,
            CrateReconciliation.is_reconciled == True
        ).scalar() or 0
        
        # Calculate missing crates
        missing_crates = total_crates - reconciled_crates
        
        # Get weight statistics
        total_original_weight = db.query(func.sum(Crate.weight)).filter(Crate.batch_id == batch_id).scalar() or 0
        total_reconciled_weight = db.query(func.sum(CrateReconciliation.weight)).filter(
            CrateReconciliation.batch_id == batch_id,
            CrateReconciliation.is_reconciled == True
        ).scalar() or 0
        total_weight_differential = db.query(func.sum(CrateReconciliation.weight_differential)).filter(
            CrateReconciliation.batch_id == batch_id,
            CrateReconciliation.is_reconciled == True
        ).scalar() or 0
        
        reconciliation_stats = {
            "total_crates": total_crates,
            "reconciled_crates": reconciled_crates,
            "missing_crates": missing_crates,
            "reconciliation_percentage": round((reconciled_crates / total_crates * 100) if total_crates > 0 else 0, 2),
            "total_original_weight": round(total_original_weight, 2),
            "total_reconciled_weight": round(total_reconciled_weight, 2),
            "total_weight_differential": round(total_weight_differential, 2),
            "weight_loss_percentage": round((total_weight_differential / total_original_weight * 100) if total_original_weight > 0 else 0, 2)
        }
        
        return {
            "status": "success",
            "message": f"Crate {qr_code} reconciled with batch {batch.batch_code}",
            "reconciliation_stats": reconciliation_stats
        }
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        logger.error(f"Error reconciling crate: {str(e)}")
        logger.error(f"Traceback: {error_traceback}")
        
        # Log specific details about the request
        logger.error(f"Batch ID: {batch_id}, QR Code: {qr_code}, Weight: {weight}")
        
        # Check if this is a database error
        if "column" in str(e).lower() and "does not exist" in str(e).lower():
            logger.error("This appears to be a missing column error. The migration may not have run successfully.")
            
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reconciling crate: {str(e)}"
        )


@router.get("/{batch_id}/reconciliation-stats", response_model=dict)
async def get_reconciliation_stats(
    batch_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    Get reconciliation statistics for a batch
    """
    try:
        # Verify batch exists
        batch = db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )
        
        # Count total crates in batch
        total_crates = db.query(func.count(Crate.id)).filter(Crate.batch_id == batch_id).scalar() or 0
        
        # Get reconciled crates count from the database
        reconciled_crates = db.query(func.count(CrateReconciliation.id)).filter(
            CrateReconciliation.batch_id == batch_id,
            CrateReconciliation.is_reconciled == True
        ).scalar() or 0
        
        # Calculate missing crates
        missing_crates = total_crates - reconciled_crates
        
        # Check if reconciliation is complete
        is_reconciliation_complete = (reconciled_crates == total_crates) and total_crates > 0
        
        # Update batch status if all crates are reconciled
        if is_reconciliation_complete and batch.status == "delivered":
            # We don't need to do anything special here since we're using the database
            # The reconciliation status is calculated on-the-fly from the database records
            pass
        
        # Get weight statistics
        total_original_weight = db.query(func.sum(Crate.weight)).filter(Crate.batch_id == batch_id).scalar() or 0
        total_reconciled_weight = db.query(func.sum(CrateReconciliation.weight)).filter(
            CrateReconciliation.batch_id == batch_id,
            CrateReconciliation.is_reconciled == True
        ).scalar() or 0
        total_weight_differential = db.query(func.sum(CrateReconciliation.weight_differential)).filter(
            CrateReconciliation.batch_id == batch_id,
            CrateReconciliation.is_reconciled == True
        ).scalar() or 0
        
        return {
            "total_crates": total_crates,
            "reconciled_crates": reconciled_crates,
            "missing_crates": missing_crates,
            "reconciliation_percentage": round((reconciled_crates / total_crates * 100) if total_crates > 0 else 0, 2),
            "is_reconciliation_complete": is_reconciliation_complete,
            "total_original_weight": round(total_original_weight, 2),
            "total_reconciled_weight": round(total_reconciled_weight, 2),
            "total_weight_differential": round(total_weight_differential, 2),
            "weight_loss_percentage": round((total_weight_differential / total_original_weight * 100) if total_original_weight > 0 else 0, 2)
        }
    except Exception as e:
        logger.error(f"Error getting reconciliation stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting reconciliation stats: {str(e)}"
        )


@router.get("/{batch_id}/weight-details", response_model=dict)
async def get_batch_weight_details(
    batch_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    Get detailed weight information for a batch
    """
    try:
        # Verify batch exists
        batch = db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )
        
        # Get all crates in the batch with their original weights
        crates = db.query(Crate).filter(Crate.batch_id == batch_id).all()
        crate_details = []
        
        total_original_weight = 0
        total_reconciled_weight = 0
        total_weight_differential = 0
        
        for crate in crates:
            # Get reconciliation record if it exists
            reconciliation = db.query(CrateReconciliation).filter(
                CrateReconciliation.batch_id == batch_id,
                CrateReconciliation.crate_id == crate.id
            ).first()
            
            original_weight = crate.weight or 0
            reconciled_weight = reconciliation.weight if reconciliation else None
            weight_differential = reconciliation.weight_differential if reconciliation else None
            
            # If weight_differential is None but we have both weights, calculate it
            if weight_differential is None and reconciled_weight is not None:
                weight_differential = reconciled_weight - original_weight
            
            total_original_weight += original_weight
            if reconciled_weight is not None:
                total_reconciled_weight += reconciled_weight
            if weight_differential is not None:
                total_weight_differential += weight_differential
            
            crate_details.append({
                "crate_id": str(crate.id),
                "qr_code": crate.qr_code,
                "original_weight": original_weight,
                "reconciled_weight": reconciled_weight,
                "weight_differential": weight_differential,
                "is_reconciled": reconciliation is not None
            })
        
        # Calculate weight loss percentage
        weight_loss_percentage = 0
        if total_original_weight > 0:
            weight_loss_percentage = (total_weight_differential / total_original_weight) * 100
        
        return {
            "batch_id": str(batch_id),
            "batch_code": batch.batch_code,
            "total_original_weight": round(total_original_weight, 2),
            "total_reconciled_weight": round(total_reconciled_weight, 2),
            "total_weight_differential": round(total_weight_differential, 2),
            "weight_loss_percentage": round(weight_loss_percentage, 2),
            "crate_details": crate_details
        }
    except Exception as e:
        logger.error(f"Error getting batch weight details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting batch weight details: {str(e)}"
        )


@router.post("/{batch_id}/deliver", response_model=dict)
async def mark_batch_delivered(
    batch_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin", "supervisor", "manager", "packhouse"]))
):
    """
    Mark a batch as delivered after reconciliation is complete
    """
    try:
        # Verify batch exists
        batch = db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )
        
        # Check if batch is in valid state for marking as delivered
        is_valid, error_message = validate_batch_transition(batch.status, "delivered")
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
        
        # Get reconciliation stats
        stats = await get_reconciliation_stats(batch_id, db, current_user)
        
        # Check if all crates are reconciled
        if not stats.get("is_reconciliation_complete", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot mark batch as delivered. All crates must be reconciled first."
            )
        
        # Mark the batch as delivered
        batch.status = "delivered"
        
        # Update batch with delivery information
        now = datetime.utcnow()
        batch.updated_at = now
        
        db.commit()
        
        logger.info(f"Batch {batch.batch_code} marked as DELIVERED by user {current_user.username} after complete reconciliation.")
        
        return {
            "status": "success",
            "message": f"Batch {batch.batch_code} has been marked as delivered",
            "batch_id": str(batch_id),
            "batch_code": batch.batch_code
        }
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error marking batch as delivered: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error marking batch as delivered: {str(e)}"
        )


@router.post("/{batch_id}/close", response_model=dict)
async def close_batch(
    batch_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin", "supervisor", "manager", "packhouse"]))
):
    """
    Close a batch after it has been delivered and reconciled
    """
    try:
        # Verify batch exists
        batch = db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )
        
        # Check if batch is in valid state for closing
        is_valid, error_message = validate_batch_transition(batch.status, "closed")
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
        
        # Close the batch
        batch.status = "closed"
        
        # Update batch with closure information
        now = datetime.utcnow()
        batch.updated_at = now
        
        db.commit()
        
        logger.info(f"Batch {batch.batch_code} closed by user {current_user.username} at {now}")
        
        return {
            "status": "success",
            "message": f"Batch {batch.batch_code} has been closed",
            "batch_id": str(batch_id),
            "batch_code": batch.batch_code
        }
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error closing batch: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error closing batch: {str(e)}"
        )