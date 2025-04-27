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
from app.models.user import User
from app.models.batch import Batch
from app.models.crate import Crate
from app.models.farm import Farm
from app.models.packhouse import Packhouse
from app.models.reconciliation import ReconciliationLog
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

@router.post("/", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
async def create_batch(
    batch_data: BatchCreate,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_user_role(["admin", "supervisor"]))
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
        
        # Verify the farm exists
        farm = db.query(Farm).filter(Farm.id == batch_data.from_location).first()
        if not farm:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Farm with ID {batch_data.from_location} not found"
            )
        
        # Verify the packhouse exists
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
            transport_mode=batch_data.transport_mode,
            from_location=batch_data.from_location,
            to_location=batch_data.to_location,
            vehicle_number=batch_data.vehicle_number,
            driver_name=batch_data.driver_name,
            eta=batch_data.eta,
            notes=batch_data.notes,
            status="open",
            total_crates=0,
            total_weight=0
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
    current_user: User = Depends(get_current_user)
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
        "notes": batch.notes,
        "created_at": batch.created_at
    }

@router.get("/code/{batch_code}", response_model=BatchResponse)
async def get_batch_by_code(
    batch_code: str,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(check_user_role(["admin", "supervisor"]))
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
            # Validate status transitions
            if batch_data.status == "in_transit" and batch.status == "open":
                if batch.departure_time is None:
                    batch.departure_time = datetime.utcnow()
            
            if batch_data.status == "delivered" and batch.status in ["open", "in_transit"]:
                if batch.arrival_time is None:
                    batch.arrival_time = datetime.utcnow()
            
            # Special case for reconciled - only admin or appropriate role can set this
            if batch_data.status == "reconciled" and current_user.role not in ["admin", "packhouse"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins or packhouse users can mark a batch as reconciled"
                )
            
            # Special case for closed - only admin can close a batch
            if batch_data.status == "closed" and current_user.role != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins can close a batch"
                )
            
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
    current_user: User = Depends(check_user_role(["admin", "supervisor"]))
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
    current_user: User = Depends(check_user_role(["admin", "supervisor", "packhouse"]))
):
    """
    Mark a batch as arrived (delivered)
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
    
    # Update batch
    batch.status = "delivered"
    batch.arrival_time = datetime.utcnow()
    
    # If departure was not recorded, record it now
    if batch.departure_time is None:
        batch.departure_time = batch.arrival_time
    
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
        variety = db.query(db.Model.varieties).filter(db.Model.varieties.id == variety_id).first()
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
        "grade_distribution": grade_distribution
    }


@router.post("/{batch_id}/add-crate", response_model=BatchResponse)
async def add_crate_to_batch(
    batch_id: uuid.UUID,
    qr_code: str,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_user_role(["admin", "supervisor"]))
):
    """
    Add a crate to a batch
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
    
    # Find the crate
    crate = db.query(Crate).filter(Crate.qr_code == qr_code).first()
    if not crate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Crate with QR code {qr_code} not found"
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
    
    # Update batch statistics
    batch.total_crates += 1
    batch.total_weight += crate.weight
    
    db.commit()
    
    logger.info(f"Crate {qr_code} added to batch {batch.batch_code} by user {current_user.username}")
    
    # Return updated batch
    return await get_batch(batch_id, db, current_user)