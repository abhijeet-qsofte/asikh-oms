# app/api/routes/varieties.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional, List
import uuid
import logging
from datetime import datetime

from app.core.database import get_db_dependency
from app.core.security import get_current_user, check_user_role
from app.models.user import User
from app.models.variety import Variety
from app.schemas.variety import (
    VarietyCreate,
    VarietyUpdate,
    VarietyResponse,
    VarietyList,
    VarietyStats
)

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/", response_model=VarietyResponse, status_code=status.HTTP_201_CREATED)
async def create_variety(
    variety_data: VarietyCreate,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_user_role(["admin"]))
):
    """
    Create a new mango variety
    Admin only endpoint
    """
    try:
        # Check if variety with same name already exists
        existing_variety = db.query(Variety).filter(Variety.name == variety_data.name).first()
        if existing_variety:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Variety with name '{variety_data.name}' already exists"
            )
        
        # Create new variety
        new_variety = Variety(
            name=variety_data.name,
            description=variety_data.description
        )
        
        db.add(new_variety)
        db.commit()
        db.refresh(new_variety)
        
        logger.info(f"Variety '{new_variety.name}' created by user {current_user.username}")
        
        return VarietyResponse.model_validate(new_variety, from_attributes=True)
    
    except HTTPException:
        raise
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating variety: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating the variety: {str(e)}"
        )

@router.get("/{variety_id}", response_model=VarietyResponse)
async def get_variety(
    variety_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_current_user)
):
    """
    Get a mango variety by ID
    """
    variety = db.query(Variety).filter(Variety.id == variety_id).first()
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variety not found"
        )
    
    return VarietyResponse.model_validate(variety, from_attributes=True)

@router.get("/", response_model=VarietyList)
async def list_varieties(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_current_user)
):
    """
    List all mango varieties with pagination and optional search
    """
    # Build query with filters
    query = db.query(Variety)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            Variety.name.ilike(search_term) | 
            Variety.description.ilike(search_term)
        )
    
    # Count total matching varieties
    total_count = query.count()
    
    # Apply pagination
    varieties = query.order_by(Variety.name)\
                    .offset((page - 1) * page_size)\
                    .limit(page_size)\
                    .all()
    
    return VarietyList(
        total=total_count,
        page=page,
        page_size=page_size,
        varieties=[VarietyResponse.model_validate(variety, from_attributes=True) for variety in varieties]
    )

@router.put("/{variety_id}", response_model=VarietyResponse)
async def update_variety(
    variety_id: uuid.UUID,
    variety_data: VarietyUpdate,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_user_role(["admin"]))
):
    """
    Update a mango variety
    Admin only endpoint
    """
    variety = db.query(Variety).filter(Variety.id == variety_id).first()
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variety not found"
        )
    
    try:
        # Check for name conflict if name is being updated
        if variety_data.name is not None and variety_data.name != variety.name:
            existing_variety = db.query(Variety).filter(Variety.name == variety_data.name).first()
            if existing_variety:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Variety with name '{variety_data.name}' already exists"
                )
            variety.name = variety_data.name
        
        # Update description if provided
        if variety_data.description is not None:
            variety.description = variety_data.description
        
        db.commit()
        db.refresh(variety)
        
        logger.info(f"Variety '{variety.name}' updated by user {current_user.username}")
        
        return VarietyResponse.model_validate(variety, from_attributes=True)
    
    except HTTPException:
        raise
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating variety: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating the variety: {str(e)}"
        )

@router.delete("/{variety_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_variety(
    variety_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_user_role(["admin"]))
):
    """
    Delete a mango variety
    Admin only endpoint
    
    Note: This will only work if the variety is not referenced by any crates
    """
    variety = db.query(Variety).filter(Variety.id == variety_id).first()
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variety not found"
        )
    
    try:
        # Check if variety has crates associated with it
        from app.models.crate import Crate
        crate_count = db.query(func.count(Crate.id)).filter(Crate.variety_id == variety_id).scalar()
        
        if crate_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete variety that is associated with {crate_count} crates"
            )
        
        db.delete(variety)
        db.commit()
        
        logger.info(f"Variety '{variety.name}' deleted by user {current_user.username}")
        
        return None
    
    except HTTPException:
        raise
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting variety: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while deleting the variety: {str(e)}"
        )

@router.get("/{variety_id}/stats", response_model=VarietyStats)
async def get_variety_stats(
    variety_id: uuid.UUID,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_current_user)
):
    """
    Get statistics for a specific mango variety
    """
    variety = db.query(Variety).filter(Variety.id == variety_id).first()
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variety not found"
        )
    
    try:
        # Import relevant models
        from app.models.crate import Crate
        from app.models.batch import Batch
        from app.models.farm import Farm
        from app.models.packhouse import Packhouse
        
        # Build base query for crates of this variety
        crate_query = db.query(Crate).filter(Crate.variety_id == variety_id)
        
        # Apply date filters if provided
        if start_date:
            crate_query = crate_query.filter(Crate.harvest_date >= start_date)
        
        if end_date:
            crate_query = crate_query.filter(Crate.harvest_date <= end_date)
        
        # Count total crates of this variety
        total_crates = crate_query.count()
        
        # Calculate total weight
        total_weight = db.query(func.sum(Crate.weight)).filter(Crate.variety_id == variety_id).scalar() or 0
        
        # Average weight per crate
        avg_weight = total_weight / total_crates if total_crates > 0 else 0
        
        # Get quality grade distribution
        grade_counts = db.query(
            Crate.quality_grade,
            func.count(Crate.id).label('count')
        ).filter(
            Crate.variety_id == variety_id
        ).group_by(
            Crate.quality_grade
        ).all()
        
        grade_distribution = {}
        for grade, count in grade_counts:
            grade_distribution[grade or "Ungraded"] = count
        
        # Get farm distribution (where this variety comes from)
        farm_counts = db.query(
            Farm.name,
            func.count(Crate.id).label('count')
        ).join(
            Batch, Crate.batch_id == Batch.id
        ).join(
            Farm, Batch.from_location == Farm.id
        ).filter(
            Crate.variety_id == variety_id
        ).group_by(
            Farm.name
        ).all()
        
        farm_distribution = {name: count for name, count in farm_counts}
        
        # Get packhouse distribution (where this variety goes to)
        packhouse_counts = db.query(
            Packhouse.name,
            func.count(Crate.id).label('count')
        ).join(
            Batch, Crate.batch_id == Batch.id
        ).join(
            Packhouse, Batch.to_location == Packhouse.id
        ).filter(
            Crate.variety_id == variety_id
        ).group_by(
            Packhouse.name
        ).all()
        
        packhouse_distribution = {name: count for name, count in packhouse_counts}
        
        # Get harvest date distribution (monthly counts)
        monthly_counts = db.query(
            func.date_trunc('month', Crate.harvest_date).label('month'),
            func.count(Crate.id).label('count')
        ).filter(
            Crate.variety_id == variety_id
        ).group_by(
            func.date_trunc('month', Crate.harvest_date)
        ).order_by(
            func.date_trunc('month', Crate.harvest_date)
        ).all()
        
        harvest_distribution = {}
        for month, count in monthly_counts:
            # Format month as 'YYYY-MM'
            month_str = month.strftime('%Y-%m')
            harvest_distribution[month_str] = count
        
        # Return combined statistics
        return VarietyStats(
            variety_id=variety.id,
            variety_name=variety.name,
            total_crates=total_crates,
            total_weight=total_weight,
            average_weight=avg_weight,
            grade_distribution=grade_distribution,
            farm_distribution=farm_distribution,
            packhouse_distribution=packhouse_distribution,
            harvest_distribution=harvest_distribution
        )
    
    except Exception as e:
        logger.error(f"Error getting variety stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while getting variety statistics: {str(e)}"
        )