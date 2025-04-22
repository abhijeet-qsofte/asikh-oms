# app/api/routes/crates.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional, List
import uuid
import logging
import base64
from datetime import datetime, timedelta
import json

from app.core.database import get_db_dependency
from app.core.security import get_current_user, check_user_role
from app.models.user import User
from app.models.crate import Crate
from app.models.qr_code import QRCode
from app.models.variety import Variety
from app.models.batch import Batch
from app.schemas.crate import (
    CrateCreate,
    CrateUpdate,
    CrateResponse,
    CrateList,
    CrateBatchAssign,
    CrateSearch
)
from app.services.storage_service import save_image

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/", response_model=CrateResponse, status_code=status.HTTP_201_CREATED)
async def create_crate(
    crate_data: CrateCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_user_role(["admin", "harvester", "supervisor"]))
):
    """
    Create a new crate record with harvesting data
    """
    # Check if QR code exists and is available
    qr_code = db.query(QRCode).filter(QRCode.code_value == crate_data.qr_code).first()
    if not qr_code:
        # Create QR code if it doesn't exist (allow dynamic creation)
        qr_code = QRCode(
            code_value=crate_data.qr_code,
            status="active",
            entity_type="crate"
        )
        db.add(qr_code)
    elif qr_code.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"QR code {crate_data.qr_code} is not active (status: {qr_code.status})"
        )

    # Check if QR code is already used for a crate
    existing_crate = db.query(Crate).filter(Crate.qr_code == crate_data.qr_code).first()
    if existing_crate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"QR code {crate_data.qr_code} is already used for another crate"
        )

    # Verify that supervisor exists
    supervisor = db.query(User).filter(User.id == crate_data.supervisor_id).first()
    if not supervisor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Supervisor with ID {crate_data.supervisor_id} not found"
        )

    # Verify that variety exists
    variety = db.query(Variety).filter(Variety.id == crate_data.variety_id).first()
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Variety with ID {crate_data.variety_id} not found"
        )

    # Process photo if provided
    photo_url = None
    if crate_data.photo_base64:
        try:
            # This will be handled in a background task
            # Generate a unique filename based on QR code and timestamp
            filename = f"{crate_data.qr_code}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.jpg"
            
            # Store photo processing in a background task
            background_tasks.add_task(
                save_image,
                base64_data=crate_data.photo_base64,
                filename=filename,
                crate_qr=crate_data.qr_code,
                db_session=db
            )
            
            # Set temporary URL that will be updated after background task
            photo_url = f"processing/{filename}"
        
        except Exception as e:
            logger.error(f"Error processing photo: {str(e)}")
            # Continue without photo if processing fails
            photo_url = None

    # Create new crate
    new_crate = Crate(
        qr_code=crate_data.qr_code,
        harvest_date=crate_data.harvest_date or datetime.utcnow(),
        gps_location=crate_data.gps_location.dict(),
        photo_url=photo_url,
        supervisor_id=crate_data.supervisor_id,
        weight=crate_data.weight,
        notes=crate_data.notes,
        variety_id=crate_data.variety_id,
        quality_grade=crate_data.quality_grade
    )
    
    db.add(new_crate)
    db.commit()
    db.refresh(new_crate)
    
    # Update QR code status to "used"
    qr_code.status = "used"
    db.commit()
    
    # Prepare response with additional data
    response = CrateResponse(
        id=new_crate.id,
        qr_code=new_crate.qr_code,
        harvest_date=new_crate.harvest_date,
        gps_location=crate_data.gps_location,
        photo_url=new_crate.photo_url,
        supervisor_id=new_crate.supervisor_id,
        supervisor_name=supervisor.full_name or supervisor.username,
        weight=new_crate.weight,
        notes=new_crate.notes,
        variety_id=new_crate.variety_id,
        variety_name=variety.name,
        batch_id=None,
        batch_code=None,
        quality_grade=new_crate.quality_grade
    )
    
    logger.info(f"Crate created with QR code {crate_data.qr_code} by user {current_user.username}")
    
    return response


@router.get("/{crate_id}", response_model=CrateResponse)
async def get_crate(
    crate_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_current_user)
):
    """
    Get a crate by ID
    """
    crate = db.query(Crate).filter(Crate.id == crate_id).first()
    if not crate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crate not found"
        )
    
    # Get related entities
    supervisor = db.query(User).filter(User.id == crate.supervisor_id).first()
    variety = db.query(Variety).filter(Variety.id == crate.variety_id).first()
    
    # Get batch if assigned
    batch_code = None
    if crate.batch_id:
        batch = db.query(Batch).filter(Batch.id == crate.batch_id).first()
        if batch:
            batch_code = batch.batch_code
    
    return CrateResponse(
        id=crate.id,
        qr_code=crate.qr_code,
        harvest_date=crate.harvest_date,
        gps_location=crate.gps_location,
        photo_url=crate.photo_url,
        supervisor_id=crate.supervisor_id,
        supervisor_name=supervisor.full_name or supervisor.username if supervisor else "Unknown",
        weight=crate.weight,
        notes=crate.notes,
        variety_id=crate.variety_id,
        variety_name=variety.name if variety else "Unknown",
        batch_id=crate.batch_id,
        batch_code=batch_code,
        quality_grade=crate.quality_grade
    )


@router.get("/qr/{qr_code}", response_model=CrateResponse)
async def get_crate_by_qr_code(
    qr_code: str,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_current_user)
):
    """
    Get a crate by QR code
    """
    crate = db.query(Crate).filter(Crate.qr_code == qr_code).first()
    if not crate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Crate with QR code {qr_code} not found"
        )
    
    # Get related entities
    supervisor = db.query(User).filter(User.id == crate.supervisor_id).first()
    variety = db.query(Variety).filter(Variety.id == crate.variety_id).first()
    
    # Get batch if assigned
    batch_code = None
    if crate.batch_id:
        batch = db.query(Batch).filter(Batch.id == crate.batch_id).first()
        if batch:
            batch_code = batch.batch_code
    
    return CrateResponse(
        id=crate.id,
        qr_code=crate.qr_code,
        harvest_date=crate.harvest_date,
        gps_location=crate.gps_location,
        photo_url=crate.photo_url,
        supervisor_id=crate.supervisor_id,
        supervisor_name=supervisor.full_name or supervisor.username if supervisor else "Unknown",
        weight=crate.weight,
        notes=crate.notes,
        variety_id=crate.variety_id,
        variety_name=variety.name if variety else "Unknown",
        batch_id=crate.batch_id,
        batch_code=batch_code,
        quality_grade=crate.quality_grade
    )


@router.put("/{crate_id}", response_model=CrateResponse)
async def update_crate(
    crate_id: uuid.UUID,
    crate_data: CrateUpdate,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_user_role(["admin", "harvester", "supervisor"]))
):
    """
    Update a crate's details
    """
    crate = db.query(Crate).filter(Crate.id == crate_id).first()
    if not crate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crate not found"
        )
    
    # Update fields if provided
    if crate_data.weight is not None:
        crate.weight = crate_data.weight
    
    if crate_data.notes is not None:
        crate.notes = crate_data.notes
    
    if crate_data.quality_grade is not None:
        crate.quality_grade = crate_data.quality_grade
    
    if crate_data.batch_id is not None:
        # Check if batch exists
        batch = db.query(Batch).filter(Batch.id == crate_data.batch_id).first()
        if not batch:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Batch with ID {crate_data.batch_id} not found"
            )
        crate.batch_id = crate_data.batch_id
    
    crate.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(crate)
    
    # Get related entities for response
    supervisor = db.query(User).filter(User.id == crate.supervisor_id).first()
    variety = db.query(Variety).filter(Variety.id == crate.variety_id).first()
    
    # Get batch if assigned
    batch_code = None
    if crate.batch_id:
        batch = db.query(Batch).filter(Batch.id == crate.batch_id).first()
        if batch:
            batch_code = batch.batch_code
    
    logger.info(f"Crate {crate_id} updated by user {current_user.username}")
    
    return CrateResponse(
        id=crate.id,
        qr_code=crate.qr_code,
        harvest_date=crate.harvest_date,
        gps_location=crate.gps_location,
        photo_url=crate.photo_url,
        supervisor_id=crate.supervisor_id,
        supervisor_name=supervisor.full_name or supervisor.username if supervisor else "Unknown",
        weight=crate.weight,
        notes=crate.notes,
        variety_id=crate.variety_id,
        variety_name=variety.name if variety else "Unknown",
        batch_id=crate.batch_id,
        batch_code=batch_code,
        quality_grade=crate.quality_grade
    )


@router.post("/batch-assign", response_model=CrateResponse)
async def assign_crate_to_batch(
    assignment: CrateBatchAssign,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_user_role(["admin", "supervisor"]))
):
    """
    Assign a crate to a batch
    """
    # Check if crate exists
    crate = db.query(Crate).filter(Crate.qr_code == assignment.qr_code).first()
    if not crate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Crate with QR code {assignment.qr_code} not found"
        )
    
    # Check if batch exists
    batch = db.query(Batch).filter(Batch.id == assignment.batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch with ID {assignment.batch_id} not found"
        )
    
    # Check if batch is open for assignments
    if batch.status not in ["open", "in_transit"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Batch {batch.batch_code} is {batch.status} and cannot accept new crates"
        )
    
    # Assign crate to batch
    crate.batch_id = assignment.batch_id
    crate.updated_at = datetime.utcnow()
    
    # Update batch statistics
    batch.total_crates += 1
    batch.total_weight += crate.weight
    batch.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(crate)
    
    # Get related entities for response
    supervisor = db.query(User).filter(User.id == crate.supervisor_id).first()
    variety = db.query(Variety).filter(Variety.id == crate.variety_id).first()
    
    logger.info(f"Crate {assignment.qr_code} assigned to batch {batch.batch_code} by user {current_user.username}")
    
    return CrateResponse(
        id=crate.id,
        qr_code=crate.qr_code,
        harvest_date=crate.harvest_date,
        gps_location=crate.gps_location,
        photo_url=crate.photo_url,
        supervisor_id=crate.supervisor_id,
        supervisor_name=supervisor.full_name or supervisor.username if supervisor else "Unknown",
        weight=crate.weight,
        notes=crate.notes,
        variety_id=crate.variety_id,
        variety_name=variety.name if variety else "Unknown",
        batch_id=crate.batch_id,
        batch_code=batch.batch_code,
        quality_grade=crate.quality_grade
    )


@router.get("/", response_model=CrateList)
async def list_crates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = "harvest_date",
    sort_desc: bool = True,
    variety_id: Optional[uuid.UUID] = None,
    supervisor_id: Optional[uuid.UUID] = None,
    batch_id: Optional[uuid.UUID] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    quality_grade: Optional[str] = None,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_current_user)
):
    """
    List crates with filtering and pagination
    """
    # Build query with filters
    query = db.query(Crate)
    
    if variety_id:
        query = query.filter(Crate.variety_id == variety_id)
    
    if supervisor_id:
        query = query.filter(Crate.supervisor_id == supervisor_id)
    
    if batch_id:
        query = query.filter(Crate.batch_id == batch_id)
    
    if from_date:
        query = query.filter(Crate.harvest_date >= from_date)
    
    if to_date:
        query = query.filter(Crate.harvest_date <= to_date)
    
    if quality_grade:
        query = query.filter(Crate.quality_grade == quality_grade)
    
    # Count total matching records
    total_count = query.count()
    
    # Apply sorting
    if sort_by == "harvest_date":
        if sort_desc:
            query = query.order_by(desc(Crate.harvest_date))
        else:
            query = query.order_by(Crate.harvest_date)
    elif sort_by == "weight":
        if sort_desc:
            query = query.order_by(desc(Crate.weight))
        else:
            query = query.order_by(Crate.weight)
    elif sort_by == "qr_code":
        if sort_desc:
            query = query.order_by(desc(Crate.qr_code))
        else:
            query = query.order_by(Crate.qr_code)
    else:
        # Default sort by harvest date desc
        query = query.order_by(desc(Crate.harvest_date))
    
    # Apply pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    # Execute query
    crates = query.all()
    
    # Prepare response items with related data
    result_items = []
    for crate in crates:
        # Get related entities
        supervisor = db.query(User).filter(User.id == crate.supervisor_id).first()
        variety = db.query(Variety).filter(Variety.id == crate.variety_id).first()
        
        # Get batch if assigned
        batch_code = None
        if crate.batch_id:
            batch = db.query(Batch).filter(Batch.id == crate.batch_id).first()
            if batch:
                batch_code = batch.batch_code
        
        result_items.append(
            CrateResponse(
                id=crate.id,
                qr_code=crate.qr_code,
                harvest_date=crate.harvest_date,
                gps_location=crate.gps_location,
                photo_url=crate.photo_url,
                supervisor_id=crate.supervisor_id,
                supervisor_name=supervisor.full_name or supervisor.username if supervisor else "Unknown",
                weight=crate.weight,
                notes=crate.notes,
                variety_id=crate.variety_id,
                variety_name=variety.name if variety else "Unknown",
                batch_id=crate.batch_id,
                batch_code=batch_code,
                quality_grade=crate.quality_grade
            )
        )
    
    return CrateList(
        total=total_count,
        page=page,
        page_size=page_size,
        crates=result_items
    )


@router.post("/search", response_model=CrateList)
async def search_crates(
    search_params: CrateSearch,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_current_user)
):
    """
    Advanced search for crates
    """
    # Build query with filters
    query = db.query(Crate)
    
    if search_params.qr_code:
        query = query.filter(Crate.qr_code.ilike(f"%{search_params.qr_code}%"))
    
    if search_params.variety_id:
        query = query.filter(Crate.variety_id == search_params.variety_id)
    
    if search_params.batch_id:
        query = query.filter(Crate.batch_id == search_params.batch_id)
    
    if search_params.supervisor_id:
        query = query.filter(Crate.supervisor_id == search_params.supervisor_id)
    
    if search_params.harvest_date_from:
        query = query.filter(Crate.harvest_date >= search_params.harvest_date_from)
    
    if search_params.harvest_date_to:
        query = query.filter(Crate.harvest_date <= search_params.harvest_date_to)
    
    if search_params.quality_grade:
        query = query.filter(Crate.quality_grade == search_params.quality_grade)
    
    # Count total matching records
    total_count = query.count()
    
    # Apply default sorting by harvest date
    query = query.order_by(desc(Crate.harvest_date))
    
    # Apply pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    # Execute query
    crates = query.all()
    
    # Prepare response items with related data
    result_items = []
    for crate in crates:
        # Get related entities
        supervisor = db.query(User).filter(User.id == crate.supervisor_id).first()
        variety = db.query(Variety).filter(Variety.id == crate.variety_id).first()
        
        # Get batch if assigned
        batch_code = None
        if crate.batch_id:
            batch = db.query(Batch).filter(Batch.id == crate.batch_id).first()
            if batch:
                batch_code = batch.batch_code
        
        result_items.append(
            CrateResponse(
                id=crate.id,
                qr_code=crate.qr_code,
                harvest_date=crate.harvest_date,
                gps_location=crate.gps_location,
                photo_url=crate.photo_url,
                supervisor_id=crate.supervisor_id,
                supervisor_name=supervisor.full_name or supervisor.username if supervisor else "Unknown",
                weight=crate.weight,
                notes=crate.notes,
                variety_id=crate.variety_id,
                variety_name=variety.name if variety else "Unknown",
                batch_id=crate.batch_id,
                batch_code=batch_code,
                quality_grade=crate.quality_grade
            )
        )
    
    return CrateList(
        total=total_count,
        page=page,
        page_size=page_size,
        crates=result_items
    )