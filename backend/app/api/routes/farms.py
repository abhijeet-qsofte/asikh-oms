# app/api/routes/farms.py
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
from app.models.farm import Farm
from app.schemas.farm import (
    FarmCreate,
    FarmUpdate,
    FarmResponse,
    FarmList,
    FarmStats
)

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/", response_model=FarmResponse, status_code=status.HTTP_201_CREATED)
async def create_farm(
    farm_data: FarmCreate,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin"]))
):
    """
    Create a new farm
    Admin only endpoint
    """
    try:
        # Check if farm with same name already exists
        existing_farm = db.query(Farm).filter(Farm.name == farm_data.name).first()
        if existing_farm:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Farm with name '{farm_data.name}' already exists"
            )
        
        # Create new farm
        new_farm = Farm(
            name=farm_data.name,
            location=farm_data.location,
            gps_coordinates=farm_data.gps_coordinates.dict() if farm_data.gps_coordinates else None,
            owner=farm_data.owner,
            contact_info=farm_data.contact_info.dict() if farm_data.contact_info else None
        )
        
        db.add(new_farm)
        db.commit()
        db.refresh(new_farm)
        
        logger.info(f"Farm '{new_farm.name}' created by user {current_user.username}")
        
        return FarmResponse.model_validate(new_farm, from_attributes=True)
    
    except HTTPException:
        raise
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating farm: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating the farm: {str(e)}"
        )

@router.get("/{farm_id}", response_model=FarmResponse)
async def get_farm(
    farm_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    Get a farm by ID
    """
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm not found"
        )
    
    return FarmResponse.model_validate(farm, from_attributes=True)

@router.get("/", response_model=FarmList)
async def list_farms(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    List all farms with pagination and optional search
    """
    # Build query with filters
    query = db.query(Farm)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            Farm.name.ilike(search_term) | 
            Farm.location.ilike(search_term) |
            Farm.owner.ilike(search_term)
        )
    
    # Count total matching farms
    total_count = query.count()
    
    # Apply pagination
    farms = query.order_by(Farm.name)\
                 .offset((page - 1) * page_size)\
                 .limit(page_size)\
                 .all()
    
    return FarmList(
        total=total_count,
        page=page,
        page_size=page_size,
        farms=[FarmResponse.model_validate(farm, from_attributes=True) for farm in farms]
    )

@router.put("/{farm_id}", response_model=FarmResponse)
async def update_farm(
    farm_id: uuid.UUID,
    farm_data: FarmUpdate,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin"]))
):
    """
    Update a farm
    Admin only endpoint
    """
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm not found"
        )
    
    try:
        # Check for name conflict if name is being updated
        if farm_data.name is not None and farm_data.name != farm.name:
            existing_farm = db.query(Farm).filter(Farm.name == farm_data.name).first()
            if existing_farm:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Farm with name '{farm_data.name}' already exists"
                )
            farm.name = farm_data.name
        
        # Update other fields if provided
        if farm_data.location is not None:
            farm.location = farm_data.location
        
        if farm_data.gps_coordinates is not None:
            farm.gps_coordinates = farm_data.gps_coordinates.dict()
        
        if farm_data.owner is not None:
            farm.owner = farm_data.owner
        
        if farm_data.contact_info is not None:
            farm.contact_info = farm_data.contact_info.dict()
        
        # Update timestamp
        farm.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(farm)
        
        logger.info(f"Farm '{farm.name}' updated by user {current_user.username}")
        
        return FarmResponse.model_validate(farm, from_attributes=True)
    
    except HTTPException:
        raise
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating farm: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating the farm: {str(e)}"
        )

@router.delete("/{farm_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_farm(
    farm_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin"]))
):
    """
    Delete a farm
    Admin only endpoint
    
    Note: This will only work if the farm is not referenced by any batches
    """
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm not found"
        )
    
    try:
        # Check if farm has batches associated with it
        from app.models.batch import Batch
        batch_count = db.query(func.count(Batch.id)).filter(Batch.from_location == farm_id).scalar()
        
        if batch_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete farm that is associated with {batch_count} batches"
            )
        
        db.delete(farm)
        db.commit()
        
        logger.info(f"Farm '{farm.name}' deleted by user {current_user.username}")
        
        return None
    
    except HTTPException:
        raise
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting farm: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while deleting the farm: {str(e)}"
        )

@router.get("/{farm_id}/stats", response_model=FarmStats)
async def get_farm_stats(
    farm_id: uuid.UUID,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    Get statistics for a specific farm
    """
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm not found"
        )
    
    try:
        # Import relevant models
        from app.models.batch import Batch
        from app.models.crate import Crate
        
        # Build base query for batches from this farm
        batch_query = db.query(Batch).filter(Batch.from_location == farm_id)
        
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
        
        # Get total crates originating from this farm
        crate_count = db.query(func.count(Crate.id))\
            .join(Batch, Crate.batch_id == Batch.id)\
            .filter(Batch.from_location == farm_id)\
            .scalar() or 0
        
        # Get total weight of all crates
        total_weight = db.query(func.sum(Crate.weight))\
            .join(Batch, Crate.batch_id == Batch.id)\
            .filter(Batch.from_location == farm_id)\
            .scalar() or 0
        
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
            Batch.from_location == farm_id
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
            Batch.from_location == farm_id
        ).group_by(
            Crate.quality_grade
        ).all()
        
        grade_distribution = {}
        for grade, count in grade_counts:
            grade_distribution[grade or "Ungraded"] = count
        
        # Get destination packhouse distribution
        from app.models.packhouse import Packhouse
        packhouse_counts = db.query(
            Packhouse.name,
            func.count(Batch.id).label('count')
        ).join(
            Packhouse, Batch.to_location == Packhouse.id
        ).filter(
            Batch.from_location == farm_id
        ).group_by(
            Packhouse.name
        ).all()
        
        packhouse_distribution = {name: count for name, count in packhouse_counts}
        
        # Return combined statistics
        return FarmStats(
            farm_id=farm.id,
            farm_name=farm.name,
            total_batches=batch_count,
            batch_status_counts=batch_status_counts,
            total_crates=crate_count,
            total_weight=total_weight,
            variety_distribution=variety_distribution,
            grade_distribution=grade_distribution,
            packhouse_distribution=packhouse_distribution
        )
    
    except Exception as e:
        logger.error(f"Error getting farm stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while getting farm statistics: {str(e)}"
        )