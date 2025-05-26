# app/api/routes/packhouses.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional, List
import uuid
import logging
from datetime import datetime

from app.core.database import get_db_dependency
from app.core.security import get_user, check_role
from app.core.bypass_auth import get_bypass_user, check_bypass_role, BYPASS_AUTHENTICATION
from app.models.user import User

# Use bypass authentication based on the environment variable
get_user = get_bypass_user if BYPASS_AUTHENTICATION else get_user
check_role = check_bypass_role if BYPASS_AUTHENTICATION else check_role
from app.models.packhouse import Packhouse
from app.schemas.packhouse import (
    PackhouseCreate,
    PackhouseUpdate,
    PackhouseResponse,
    PackhouseList,
    PackhouseStats
)

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/", response_model=PackhouseResponse, status_code=status.HTTP_201_CREATED)
async def create_packhouse(
    packhouse_data: PackhouseCreate,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin"]))
):
    """
    Create a new packhouse
    Admin only endpoint
    """
    try:
        # Check if packhouse with same name already exists
        existing_packhouse = db.query(Packhouse).filter(Packhouse.name == packhouse_data.name).first()
        if existing_packhouse:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Packhouse with name '{packhouse_data.name}' already exists"
            )
        
        # Create new packhouse
        new_packhouse = Packhouse(
            name=packhouse_data.name,
            location=packhouse_data.location,
            gps_coordinates=packhouse_data.gps_coordinates.dict() if packhouse_data.gps_coordinates else None,
            manager=packhouse_data.manager,
            contact_info=packhouse_data.contact_info.dict() if packhouse_data.contact_info else None
        )
        
        db.add(new_packhouse)
        db.commit()
        db.refresh(new_packhouse)
        
        logger.info(f"Packhouse '{new_packhouse.name}' created by user {current_user.username}")
        
        return PackhouseResponse.model_validate(new_packhouse, from_attributes=True)
    
    except HTTPException:
        raise
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating packhouse: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating the packhouse: {str(e)}"
        )

@router.get("/{packhouse_id}", response_model=PackhouseResponse)
async def get_packhouse(
    packhouse_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    Get a packhouse by ID
    """
    packhouse = db.query(Packhouse).filter(Packhouse.id == packhouse_id).first()
    if not packhouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Packhouse not found"
        )
    
    return PackhouseResponse.model_validate(packhouse, from_attributes=True)

@router.get("/", response_model=PackhouseList)
async def list_packhouses(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    List all packhouses with pagination and optional search
    """
    # Build query with filters
    query = db.query(Packhouse)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            Packhouse.name.ilike(search_term) | 
            Packhouse.location.ilike(search_term) |
            Packhouse.manager.ilike(search_term)
        )
    
    # Count total matching packhouses
    total_count = query.count()
    
    # Apply pagination
    packhouses = query.order_by(Packhouse.name)\
                     .offset((page - 1) * page_size)\
                     .limit(page_size)\
                     .all()
    
    return PackhouseList(
        total=total_count,
        page=page,
        page_size=page_size,
        packhouses=[PackhouseResponse.model_validate(packhouse, from_attributes=True) for packhouse in packhouses]
    )

@router.put("/{packhouse_id}", response_model=PackhouseResponse)
async def update_packhouse(
    packhouse_id: uuid.UUID,
    packhouse_data: PackhouseUpdate,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin"]))
):
    """
    Update a packhouse
    Admin only endpoint
    """
    packhouse = db.query(Packhouse).filter(Packhouse.id == packhouse_id).first()
    if not packhouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Packhouse not found"
        )
    
    try:
        # Check for name conflict if name is being updated
        if packhouse_data.name is not None and packhouse_data.name != packhouse.name:
            existing_packhouse = db.query(Packhouse).filter(Packhouse.name == packhouse_data.name).first()
            if existing_packhouse:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Packhouse with name '{packhouse_data.name}' already exists"
                )
            packhouse.name = packhouse_data.name
        
        # Update other fields if provided
        if packhouse_data.location is not None:
            packhouse.location = packhouse_data.location
        
        if packhouse_data.gps_coordinates is not None:
            packhouse.gps_coordinates = packhouse_data.gps_coordinates.dict()
        
        if packhouse_data.manager is not None:
            packhouse.manager = packhouse_data.manager
        
        if packhouse_data.contact_info is not None:
            packhouse.contact_info = packhouse_data.contact_info.dict()
        
        # Update timestamp
        packhouse.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(packhouse)
        
        logger.info(f"Packhouse '{packhouse.name}' updated by user {current_user.username}")
        
        return PackhouseResponse.model_validate(packhouse, from_attributes=True)
    
    except HTTPException:
        raise
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating packhouse: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating the packhouse: {str(e)}"
        )

@router.delete("/{packhouse_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_packhouse(
    packhouse_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin"]))
):
    """
    Delete a packhouse
    Admin only endpoint
    
    Note: This will only work if the packhouse is not referenced by any batches
    """
    packhouse = db.query(Packhouse).filter(Packhouse.id == packhouse_id).first()
    if not packhouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Packhouse not found"
        )
    
    try:
        # Check if packhouse has batches associated with it
        from app.models.batch import Batch
        batch_count = db.query(func.count(Batch.id)).filter(Batch.to_location == packhouse_id).scalar()
        
        if batch_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete packhouse that is associated with {batch_count} batches"
            )
        
        db.delete(packhouse)
        db.commit()
        
        logger.info(f"Packhouse '{packhouse.name}' deleted by user {current_user.username}")
        
        return None
    
    except HTTPException:
        raise
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting packhouse: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while deleting the packhouse: {str(e)}"
        )

@router.get("/{packhouse_id}/stats", response_model=PackhouseStats)
async def get_packhouse_stats(
    packhouse_id: uuid.UUID,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    Get statistics for a specific packhouse
    """
    packhouse = db.query(Packhouse).filter(Packhouse.id == packhouse_id).first()
    if not packhouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Packhouse not found"
        )
    
    try:
        # Import relevant models
        from app.models.batch import Batch
        from app.models.crate import Crate
        from app.models.farm import Farm
        from app.models.reconciliation import ReconciliationLog
        
        # Build base query for batches to this packhouse
        batch_query = db.query(Batch).filter(Batch.to_location == packhouse_id)
        
        # Apply date filters if provided
        if start_date:
            batch_query = batch_query.filter(Batch.created_at >= start_date)
        
        if end_date:
            batch_query = batch_query.filter(Batch.created_at <= end_date)
        
        # Count total batches
        batch_count = batch_query.count()
        
        # Get counts by status
        batch_status_counts = {}
        for status_name in ["open", "in_transit", "delivered", "reconciled", "closed"]:
            count = batch_query.filter(Batch.status == status_name).count()
            batch_status_counts[status_name] = count
        
        # Get total crates destined for this packhouse
        crate_count = db.query(func.count(Crate.id))\
            .join(Batch, Crate.batch_id == Batch.id)\
            .filter(Batch.to_location == packhouse_id)\
            .scalar() or 0
        
        # Get total weight of all crates
        total_weight = db.query(func.sum(Crate.weight))\
            .join(Batch, Crate.batch_id == Batch.id)\
            .filter(Batch.to_location == packhouse_id)\
            .scalar() or 0
        
        # Get reconciliation statistics
        reconciled_count = db.query(func.count(ReconciliationLog.id))\
            .filter(
                ReconciliationLog.batch_id.in_(
                    db.query(Batch.id).filter(Batch.to_location == packhouse_id)
                ),
                ReconciliationLog.status == "matched"
            ).scalar() or 0
        
        # Calculate reconciliation rate
        reconciliation_rate = (reconciled_count / crate_count * 100) if crate_count > 0 else 0
        
        # Get variety distribution
        from app.models.variety import Variety
        variety_counts = db.query(
            Variety.name,
            func.count(Crate.id).label('count')
        ).join(
            Batch, Crate.batch_id == Batch.id
        ).join(
            Variety, Crate.variety_id == Variety.id
        ).filter(
            Batch.to_location == packhouse_id
        ).group_by(
            Variety.name
        ).all()
        
        variety_distribution = {name: count for name, count in variety_counts}
        
        # Get quality grade distribution
        grade_counts = db.query(
            Crate.quality_grade,
            func.count(Crate.id).label('count')
        ).join(
            Batch, Crate.batch_id == Batch.id
        ).filter(
            Batch.to_location == packhouse_id
        ).group_by(
            Crate.quality_grade
        ).all()
        
        grade_distribution = {}
        for grade, count in grade_counts:
            grade_distribution[grade or "Ungraded"] = count
        
        # Get source farm distribution
        farm_counts = db.query(
            Farm.name,
            func.count(Batch.id).label('count')
        ).join(
            Farm, Batch.from_location == Farm.id
        ).filter(
            Batch.to_location == packhouse_id
        ).group_by(
            Farm.name
        ).all()
        
        farm_distribution = {name: count for name, count in farm_counts}
        
        # Get reconciliation status distribution
        recon_status_counts = db.query(
            ReconciliationLog.status,
            func.count(ReconciliationLog.id).label('count')
        ).filter(
            ReconciliationLog.batch_id.in_(
                db.query(Batch.id).filter(Batch.to_location == packhouse_id)
            )
        ).group_by(
            ReconciliationLog.status
        ).all()
        
        recon_status_distribution = {status: count for status, count in recon_status_counts}
        
        # Return combined statistics
        return PackhouseStats(
            packhouse_id=packhouse.id,
            packhouse_name=packhouse.name,
            total_batches=batch_count,
            batch_status_counts=batch_status_counts,
            total_crates=crate_count,
            reconciled_crates=reconciled_count,
            reconciliation_rate=reconciliation_rate,
            total_weight=total_weight,
            variety_distribution=variety_distribution,
            grade_distribution=grade_distribution,
            farm_distribution=farm_distribution,
            reconciliation_status_distribution=recon_status_distribution
        )
    
    except Exception as e:
        logger.error(f"Error getting packhouse stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while getting packhouse statistics: {str(e)}"
        )