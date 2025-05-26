# app/api/routes/reconciliation.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, text, distinct
from typing import Optional, List, Dict, Any
import uuid
import logging
from datetime import datetime, timedelta
import json

from app.core.database import get_db_dependency
from app.core.security import get_user, check_role
from app.core.bypass_auth import get_bypass_user, check_bypass_role, BYPASS_AUTHENTICATION
from app.models.user import User

# Use bypass authentication based on the environment variable
get_user = get_bypass_user if BYPASS_AUTHENTICATION else get_user
check_role = check_bypass_role if BYPASS_AUTHENTICATION else check_role
from app.models.crate import Crate
from app.models.qr_code import QRCode
from app.models.batch import Batch
from app.models.variety import Variety
from app.models.reconciliation import ReconciliationLog
from app.schemas.reconciliation import (
    ReconciliationScan,
    ReconciliationResponse,
    ReconciliationList,
    BatchReconciliationSummary,
    ReconciliationSearch,
    ReconciliationStats
)

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/scan", response_model=ReconciliationResponse, status_code=status.HTTP_201_CREATED)
async def scan_crate(
    scan_data: ReconciliationScan,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin", "packhouse", "supervisor", "manager"]))
):
    """
    Scan a crate for reconciliation at the packhouse
    """
    # Verify the batch exists
    batch = db.query(Batch).filter(Batch.id == scan_data.batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch with ID {scan_data.batch_id} not found"
        )
    
    # Check if batch status allows reconciliation
    if batch.status not in ["in_transit", "delivered", "reconciled"]:
        logger.warning(f"Attempted to reconcile crate for batch {batch.batch_code} with status {batch.status}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Batch {batch.batch_code} is in {batch.status} status and cannot be reconciled"
        )
    
    # Check if the QR code has been scanned already for this batch
    existing_scan = db.query(ReconciliationLog).filter(
        and_(
            ReconciliationLog.batch_id == scan_data.batch_id,
            ReconciliationLog.scanned_qr == scan_data.qr_code
        )
    ).first()
    
    if existing_scan:
        # Return duplicate scan status
        logger.info(f"Duplicate scan of QR code {scan_data.qr_code} for batch {batch.batch_code}")
        return ReconciliationResponse(
            id=existing_scan.id,
            qr_code=existing_scan.scanned_qr,
            batch_id=existing_scan.batch_id,
            batch_code=batch.batch_code,
            status="duplicate",
            timestamp=existing_scan.timestamp,
            scanned_by_id=existing_scan.scanned_by_id,
            scanned_by_name=current_user.full_name or current_user.username,
            crate_info=None
        )
    
    # Find the crate by QR code
    crate = db.query(Crate).filter(Crate.qr_code == scan_data.qr_code).first()
    
    # Determine scan status and crate_id
    crate_id = None
    crate_info = None
    
    if not crate:
        # QR code not found in system
        status = "not_found"
    elif crate.batch_id != scan_data.batch_id:
        # Crate belongs to a different batch
        status = "wrong_batch"
        crate_id = crate.id
        
        # Get related entities for crate info
        crate_batch = None
        if crate.batch_id:
            crate_batch = db.query(Batch).filter(Batch.id == crate.batch_id).first()
        
        # Prepare basic crate details for the response
        crate_info = {
            "id": str(crate.id),
            "qr_code": crate.qr_code,
            "weight": crate.weight,
            "variety_id": str(crate.variety_id),
            "assigned_batch_id": str(crate.batch_id) if crate.batch_id else None,
            "assigned_batch_code": crate_batch.batch_code if crate_batch else None
        }
    else:
        # Crate matches the batch - successful reconciliation
        status = "matched"
        crate_id = crate.id
        
        # Prepare crate details for the response
        variety = db.query(Variety).filter(Variety.id == crate.variety_id).first()
        
        supervisor = db.query(User).filter(User.id == crate.supervisor_id).first()
        
        crate_info = {
            "id": str(crate.id),
            "qr_code": crate.qr_code,
            "weight": crate.weight,
            "variety_id": str(crate.variety_id),
            "variety_name": variety.name if variety else "Unknown",
            "harvest_date": crate.harvest_date.isoformat(),
            "supervisor_name": supervisor.full_name if supervisor else "Unknown"
        }
    
    # Create reconciliation log entry
    recon_log = ReconciliationLog(
        batch_id=scan_data.batch_id,
        scanned_qr=scan_data.qr_code,
        crate_id=crate_id,
        status=status,
        timestamp=datetime.utcnow(),
        scanned_by_id=current_user.id,
        location=scan_data.location.dict() if scan_data.location else None,
        device_info=scan_data.device_info.dict() if scan_data.device_info else None,
        notes=scan_data.notes
    )
    
    db.add(recon_log)
    db.commit()
    db.refresh(recon_log)
    
    # Check if batch status needs to be updated to "reconciled"
    if batch.status == "delivered" and status == "matched":
        # Count total crates in batch
        total_crates_in_batch = db.query(func.count(Crate.id)).filter(Crate.batch_id == batch.id).scalar()
        
        # Count unique matched crates
        matched_crates = db.query(func.count(distinct(ReconciliationLog.crate_id))).filter(
            and_(
                ReconciliationLog.batch_id == batch.id,
                ReconciliationLog.status == "matched"
            )
        ).scalar()
        
        # If all crates are matched, update batch status to "reconciled"
        if matched_crates >= total_crates_in_batch and total_crates_in_batch > 0:
            batch.status = "reconciled"
            db.commit()
            logger.info(f"Batch {batch.batch_code} automatically marked as reconciled")
    
    logger.info(f"Reconciliation scan: QR {scan_data.qr_code}, Batch {batch.batch_code}, Status: {status}")
    
    return ReconciliationResponse(
        id=recon_log.id,
        qr_code=recon_log.scanned_qr,
        batch_id=recon_log.batch_id,
        batch_code=batch.batch_code,
        status=status,
        timestamp=recon_log.timestamp,
        scanned_by_id=current_user.id,
        scanned_by_name=current_user.full_name or current_user.username,
        crate_info=crate_info
    )


@router.get("/batch/{batch_id}/summary", response_model=BatchReconciliationSummary)
async def get_batch_reconciliation_summary(
    batch_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    Get reconciliation summary for a specific batch
    """
    # Verify the batch exists
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch with ID {batch_id} not found"
        )
    
    # Get total crates assigned to the batch
    total_crates = db.query(func.count(Crate.id)).filter(Crate.batch_id == batch_id).scalar()
    
    # Get all crates in the batch
    batch_crates = db.query(Crate.qr_code).filter(Crate.batch_id == batch_id).all()
    batch_qr_codes = [crate.qr_code for crate in batch_crates]
    
    # Get reconciliation stats
    # 1. All scanned QR codes for this batch
    all_scans = db.query(ReconciliationLog).filter(
        ReconciliationLog.batch_id == batch_id
    ).order_by(ReconciliationLog.timestamp.desc()).all()
    
    # Count unique QR codes scanned
    unique_scanned_qrs = set()
    for scan in all_scans:
        unique_scanned_qrs.add(scan.scanned_qr)
    scanned_crates = len(unique_scanned_qrs)
    
    # Process scan results
    matched_count = 0
    mismatched_count = 0
    wrong_batch_scans = []
    missing_qr_codes = []
    duplicate_count = 0
    
    status_counts = {
        "matched": 0,
        "wrong_batch": 0,
        "not_found": 0,
        "duplicate": 0
    }
    
    # Count by status
    for scan in all_scans:
        if scan.status in status_counts:
            status_counts[scan.status] += 1
    
    # Find wrongly scanned crates
    wrong_batch_records = db.query(ReconciliationLog).filter(
        and_(
            ReconciliationLog.batch_id == batch_id,
            ReconciliationLog.status == "wrong_batch"
        )
    ).all()
    
    for record in wrong_batch_records:
        if record.crate_id:
            crate = db.query(Crate).filter(Crate.id == record.crate_id).first()
            actual_batch = db.query(Batch).filter(Batch.id == crate.batch_id).first() if crate.batch_id else None
            
            wrong_batch_scans.append({
                "qr_code": record.scanned_qr,
                "actual_batch_id": str(crate.batch_id) if crate.batch_id else None,
                "actual_batch_code": actual_batch.batch_code if actual_batch else None,
                "scanned_at": record.timestamp.isoformat()
            })
    
    # Find missing crates
    scanned_qr_set = set([scan.scanned_qr for scan in all_scans if scan.status == "matched"])
    for qr_code in batch_qr_codes:
        if qr_code not in scanned_qr_set:
            missing_qr_codes.append(qr_code)
    
    # Calculate total weight of crates in the batch
    total_weight = db.query(func.sum(Crate.weight)).filter(Crate.batch_id == batch_id).scalar() or 0
    
    # Get last scan and completion time
    last_scan = None
    completed_at = None
    
    if all_scans:
        last_scan = all_scans[0].timestamp
    
    # A batch is considered fully reconciled if all crates are scanned and matched
    reconciliation_status = "incomplete"
    reconciliation_progress = 0
    
    if total_crates > 0:
        reconciliation_progress = (status_counts["matched"] / total_crates) * 100
    
    if batch.status == "reconciled":
        reconciliation_status = "complete"
        # Find when it was completed by looking for the last matched scan
        last_matched_scan = db.query(ReconciliationLog).filter(
            and_(
                ReconciliationLog.batch_id == batch_id,
                ReconciliationLog.status == "matched"
            )
        ).order_by(ReconciliationLog.timestamp.desc()).first()
        
        if last_matched_scan:
            completed_at = last_matched_scan.timestamp
    
    return BatchReconciliationSummary(
        batch_id=batch_id,
        batch_code=batch.batch_code,
        total_crates=total_crates,
        scanned_crates=scanned_crates,
        matched=status_counts["matched"],
        mismatched=status_counts["not_found"],
        missing=missing_qr_codes,
        wrong_batch=wrong_batch_scans,
        duplicates=status_counts["duplicate"],
        total_weight=total_weight,
        reconciliation_status=reconciliation_status,
        reconciliation_progress=reconciliation_progress,
        last_scan=last_scan,
        completed_at=completed_at
    )


@router.get("/batch/{batch_id}/logs", response_model=ReconciliationList)
async def get_batch_reconciliation_logs(
    batch_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    Get all reconciliation logs for a specific batch with pagination
    """
    # Verify the batch exists
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch with ID {batch_id} not found"
        )
    
    # Build query
    query = db.query(ReconciliationLog).filter(ReconciliationLog.batch_id == batch_id)
    
    # Add status filter if provided
    if status:
        query = query.filter(ReconciliationLog.status == status)
    
    # Count total matching logs
    total_count = query.count()
    
    # Apply sorting and pagination
    logs = query.order_by(ReconciliationLog.timestamp.desc())\
               .offset((page - 1) * page_size)\
               .limit(page_size)\
               .all()
    
    # Prepare response items
    result_items = []
    for log in logs:
        # Get user who scanned
        user = db.query(User).filter(User.id == log.scanned_by_id).first()
        
        # Get crate info if available
        crate_info = None
        if log.crate_id:
            crate = db.query(Crate).filter(Crate.id == log.crate_id).first()
            if crate:
                variety = db.query(Variety).filter(Variety.id == crate.variety_id).first()
                supervisor = db.query(User).filter(User.id == crate.supervisor_id).first()
                
                crate_info = {
                    "id": str(crate.id),
                    "qr_code": crate.qr_code,
                    "weight": crate.weight,
                    "variety_id": str(crate.variety_id),
                    "variety_name": variety.name if variety else "Unknown",
                    "harvest_date": crate.harvest_date.isoformat(),
                    "supervisor_name": supervisor.full_name or supervisor.username if supervisor else "Unknown"
                }
        
        result_items.append(
            ReconciliationResponse(
                id=log.id,
                qr_code=log.scanned_qr,
                batch_id=log.batch_id,
                batch_code=batch.batch_code,
                status=log.status,
                timestamp=log.timestamp,
                scanned_by_id=log.scanned_by_id,
                scanned_by_name=user.full_name or user.username if user else "Unknown",
                crate_info=crate_info
            )
        )
    
    return ReconciliationList(
        total=total_count,
        page=page,
        page_size=page_size,
        logs=result_items
    )


@router.post("/search", response_model=ReconciliationList)
async def search_reconciliation_logs(
    search_params: ReconciliationSearch,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    Search reconciliation logs with filters
    """
    # Build query with filters
    query = db.query(ReconciliationLog)
    
    if search_params.batch_id:
        query = query.filter(ReconciliationLog.batch_id == search_params.batch_id)
    
    if search_params.qr_code:
        query = query.filter(ReconciliationLog.scanned_qr.ilike(f"%{search_params.qr_code}%"))
    
    if search_params.status:
        query = query.filter(ReconciliationLog.status == search_params.status)
    
    if search_params.scanned_by_id:
        query = query.filter(ReconciliationLog.scanned_by_id == search_params.scanned_by_id)
    
    if search_params.timestamp_from:
        query = query.filter(ReconciliationLog.timestamp >= search_params.timestamp_from)
    
    if search_params.timestamp_to:
        query = query.filter(ReconciliationLog.timestamp <= search_params.timestamp_to)
    
    # Count total matching logs
    total_count = query.count()
    
    # Apply sorting and pagination
    logs = query.order_by(ReconciliationLog.timestamp.desc())\
               .offset((page - 1) * page_size)\
               .limit(page_size)\
               .all()
    
    # Prepare response items
    result_items = []
    for log in logs:
        # Get batch code
        batch = db.query(Batch).filter(Batch.id == log.batch_id).first()
        
        # Get user who scanned
        user = db.query(User).filter(User.id == log.scanned_by_id).first()
        
        # Get crate info if available
        crate_info = None
        if log.crate_id:
            crate = db.query(Crate).filter(Crate.id == log.crate_id).first()
            if crate:
                variety = db.query(Variety).filter(Variety.id == crate.variety_id).first()
                supervisor = db.query(User).filter(User.id == crate.supervisor_id).first()
                
                crate_info = {
                    "id": str(crate.id),
                    "qr_code": crate.qr_code,
                    "weight": crate.weight,
                    "variety_id": str(crate.variety_id),
                    "variety_name": variety.name if variety else "Unknown",
                    "harvest_date": crate.harvest_date.isoformat(),
                    "supervisor_name": supervisor.full_name or supervisor.username if supervisor else "Unknown"
                }
        
        result_items.append(
            ReconciliationResponse(
                id=log.id,
                qr_code=log.scanned_qr,
                batch_id=log.batch_id,
                batch_code=batch.batch_code if batch else "Unknown",
                status=log.status,
                timestamp=log.timestamp,
                scanned_by_id=log.scanned_by_id,
                scanned_by_name=user.full_name or user.username if user else "Unknown",
                crate_info=crate_info
            )
        )
    
    return ReconciliationList(
        total=total_count,
        page=page,
        page_size=page_size,
        logs=result_items
    )


@router.get("/stats", response_model=ReconciliationStats)
async def get_reconciliation_stats(
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin", "supervisor", "manager"]))
):
    """
    Get overall reconciliation statistics
    """
    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Count total batches in different states
    total_batches = db.query(func.count(Batch.id)).scalar()
    total_reconciled = db.query(func.count(Batch.id)).filter(Batch.status == "reconciled").scalar()
    total_in_progress = db.query(func.count(Batch.id)).filter(Batch.status == "delivered").scalar()
    total_pending = db.query(func.count(Batch.id)).filter(Batch.status == "in_transit").scalar()
    
    # Count crates and scans
    total_crates = db.query(func.count(Crate.id)).scalar()
    
    # Count crates that have been scanned successfully
    total_scanned = db.query(func.count(distinct(ReconciliationLog.crate_id))).filter(
        ReconciliationLog.status == "matched"
    ).scalar()
    
    # Calculate reconciliation rate
    reconciliation_rate = (total_scanned / total_crates * 100) if total_crates > 0 else 0
    
    # Calculate average scan time
    # This query calculates average time between scans
    avg_scan_time_query = text("""
        WITH scan_times AS (
            SELECT
                batch_id,
                scanned_by_id,
                timestamp,
                LAG(timestamp) OVER (PARTITION BY batch_id, scanned_by_id ORDER BY timestamp) as prev_timestamp
            FROM reconciliation_logs
            WHERE timestamp >= :start_date
        )
        SELECT AVG(EXTRACT(EPOCH FROM (timestamp - prev_timestamp)))
        FROM scan_times
        WHERE prev_timestamp IS NOT NULL
        AND EXTRACT(EPOCH FROM (timestamp - prev_timestamp)) BETWEEN 1 AND 60
    """)
    
    avg_time_result = db.execute(avg_scan_time_query, {"start_date": start_date}).scalar()
    average_time_per_scan = avg_time_result or 0
    
    # Get daily scans for the specified period
    daily_scans = {}
    
    # Generate all dates in the range
    current_date = start_date.date()
    while current_date <= end_date.date():
        daily_scans[current_date.isoformat()] = 0
        current_date += timedelta(days=1)
    
    # Count scans per day
    daily_scan_counts = db.query(
        func.date_trunc('day', ReconciliationLog.timestamp).label('day'),
        func.count().label('count')
    ).filter(
        ReconciliationLog.timestamp >= start_date
    ).group_by(
        func.date_trunc('day', ReconciliationLog.timestamp)
    ).all()
    
    # Populate with actual counts
    for day, count in daily_scan_counts:
        daily_scans[day.date().isoformat()] = count
    
    # Get reconciliation counts by status
    status_counts = db.query(
        ReconciliationLog.status,
        func.count().label('count')
    ).group_by(ReconciliationLog.status).all()
    
    reconciliation_by_status = {
        "matched": 0,
        "wrong_batch": 0,
        "not_found": 0,
        "duplicate": 0
    }
    
    for status, count in status_counts:
        if status in reconciliation_by_status:
            reconciliation_by_status[status] = count
    
    return ReconciliationStats(
        total_batches=total_batches,
        total_reconciled=total_reconciled,
        total_in_progress=total_in_progress,
        total_pending=total_pending,
        total_crates=total_crates,
        total_scanned=total_scanned,
        reconciliation_rate=reconciliation_rate,
        average_time_per_scan=average_time_per_scan,
        daily_scans=daily_scans,
        reconciliation_by_status=reconciliation_by_status
    )


@router.post("/batch/{batch_id}/complete", status_code=status.HTTP_200_OK)
async def complete_batch_reconciliation(
    batch_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin", "packhouse", "supervisor", "manager"]))
):
    """
    Manually mark a batch as reconciled
    """
    # Verify the batch exists
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch with ID {batch_id} not found"
        )
    
    # Check if batch status allows completion
    if batch.status not in ["delivered", "in_transit"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Batch {batch.batch_code} with status {batch.status} cannot be marked as reconciled"
        )
    
    # Update batch status
    batch.status = "reconciled"
    db.commit()
    
    logger.info(f"Batch {batch.batch_code} manually marked as reconciled by user {current_user.username}")
    
    return {"message": f"Batch {batch.batch_code} has been marked as reconciled"}