# app/api/routes/qr_codes.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional, List
import uuid
import logging
import io

from app.core.database import get_db_dependency
from app.core.security import get_user, check_role
from app.core.bypass_auth import get_bypass_user, check_bypass_role, BYPASS_AUTHENTICATION
from app.models.user import User

# Use bypass authentication based on the environment variable
get_user = get_bypass_user if BYPASS_AUTHENTICATION else get_user
check_role = check_bypass_role if BYPASS_AUTHENTICATION else check_role
from app.models.qr_code import QRCode
from app.schemas.qr_code import (
    QRCodeCreate,
    QRCodeResponse,
    QRCodeList,
    QRCodeUpdate,
    QRCodeBatch,
    QRCodeDownload
)
from app.services.qr_service import (
    generate_qr_code,
    generate_qr_code_base64,
    batch_generate_qr_codes,
    validate_qr_code
)

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/", response_model=QRCodeResponse, status_code=status.HTTP_201_CREATED)
async def create_qr_code(
    qr_data: QRCodeCreate,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin", "supervisor", "manager"]))
):
    """
    Create a new QR code
    """
    # If code value is provided, validate it
    if qr_data.code_value:
        # Check if QR code already exists
        existing_qr = db.query(QRCode).filter(QRCode.code_value == qr_data.code_value).first()
        if existing_qr:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"QR code with value {qr_data.code_value} already exists"
            )
        
        # Validate format
        if not validate_qr_code(qr_data.code_value):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid QR code format. Must match ASIKH-<PREFIX>-<UUID>"
            )
        
        code_value = qr_data.code_value
    else:
        # Generate a new QR code with the specified prefix
        code_value, _ = generate_qr_code(qr_data.prefix)
    
    # Create QR code record
    qr_code = QRCode(
        code_value=code_value,
        status=qr_data.status,
        entity_type=qr_data.entity_type
    )
    
    db.add(qr_code)
    db.commit()
    db.refresh(qr_code)
    
    # Generate QR code image
    _, qr_image_base64 = generate_qr_code_base64(code_value=code_value)
    
    logger.info(f"QR code {code_value} created by user {current_user.username}")
    
    return {
        "id": qr_code.id,
        "code_value": qr_code.code_value,
        "status": qr_code.status,
        "entity_type": qr_code.entity_type,
        "created_at": qr_code.created_at,
        "updated_at": qr_code.updated_at,
        "qr_image": qr_image_base64
    }

@router.get("/{qr_id}", response_model=QRCodeResponse)
async def get_qr_code(
    qr_id: uuid.UUID,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    Get a QR code by ID
    """
    qr_code = db.query(QRCode).filter(QRCode.id == qr_id).first()
    if not qr_code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR code not found"
        )
    
    # Generate QR code image
    _, qr_image_base64 = generate_qr_code_base64(code_value=qr_code.code_value)
    
    return {
        "id": qr_code.id,
        "code_value": qr_code.code_value,
        "status": qr_code.status,
        "entity_type": qr_code.entity_type,
        "created_at": qr_code.created_at,
        "updated_at": qr_code.updated_at,
        "qr_image": qr_image_base64
    }

@router.get("/value/{code_value}", response_model=QRCodeResponse)
async def get_qr_code_by_value(
    code_value: str,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    Get a QR code by value
    """
    qr_code = db.query(QRCode).filter(QRCode.code_value == code_value).first()
    if not qr_code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"QR code with value {code_value} not found"
        )
    
    # Generate QR code image
    _, qr_image_base64 = generate_qr_code_base64(code_value=qr_code.code_value)
    
    return {
        "id": qr_code.id,
        "code_value": qr_code.code_value,
        "status": qr_code.status,
        "entity_type": qr_code.entity_type,
        "created_at": qr_code.created_at,
        "updated_at": qr_code.updated_at,
        "qr_image": qr_image_base64
    }

@router.get("/", response_model=QRCodeList)
async def list_qr_codes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    entity_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    List all QR codes with pagination and filtering
    """
    # Build query with filters
    query = db.query(QRCode)
    
    if status:
        query = query.filter(QRCode.status == status)
    
    if entity_type:
        query = query.filter(QRCode.entity_type == entity_type)
    
    if search:
        query = query.filter(QRCode.code_value.ilike(f"%{search}%"))
    
    # Count total matching records
    total_count = query.count()
    
    # Apply pagination
    qr_codes = query.order_by(desc(QRCode.created_at))\
                    .offset((page - 1) * page_size)\
                    .limit(page_size)\
                    .all()
    
    # Don't include QR images in the list to save bandwidth
    result_items = [
        {
            "id": qr.id,
            "code_value": qr.code_value,
            "status": qr.status,
            "entity_type": qr.entity_type,
            "created_at": qr.created_at,
            "updated_at": qr.updated_at,
            "qr_image": None  # No image in list view
        }
        for qr in qr_codes
    ]
    
    return {
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "qr_codes": result_items
    }

@router.put("/{qr_id}", response_model=QRCodeResponse)
async def update_qr_code(
    qr_id: uuid.UUID,
    qr_data: QRCodeUpdate,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin", "supervisor", "manager"]))
):
    """
    Update a QR code's status or entity type
    """
    qr_code = db.query(QRCode).filter(QRCode.id == qr_id).first()
    if not qr_code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR code not found"
        )
    
    # Update fields if provided
    if qr_data.status is not None:
        qr_code.status = qr_data.status
    
    if qr_data.entity_type is not None:
        qr_code.entity_type = qr_data.entity_type
    
    db.commit()
    db.refresh(qr_code)
    
    # Generate QR code image
    _, qr_image_base64 = generate_qr_code_base64(code_value=qr_code.code_value)
    
    logger.info(f"QR code {qr_code.code_value} updated by user {current_user.username}")
    
    return {
        "id": qr_code.id,
        "code_value": qr_code.code_value,
        "status": qr_code.status,
        "entity_type": qr_code.entity_type,
        "created_at": qr_code.created_at,
        "updated_at": qr_code.updated_at,
        "qr_image": qr_image_base64
    }

@router.post("/batch", response_model=List[QRCodeResponse])
async def create_qr_code_batch(
    batch_data: QRCodeBatch,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin", "supervisor", "manager"]))
):
    """
    Generate a batch of QR codes
    """
    try:
        # Validate count
        if batch_data.count <= 0 or batch_data.count > 1000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Count must be between 1 and 1000"
            )
        
        # Generate QR codes
        qr_codes = batch_generate_qr_codes(
            db, 
            batch_data.count, 
            batch_data.prefix, 
            batch_data.entity_type
        )
        
        # Generate QR code images for response
        result = []
        for qr in qr_codes:
            _, qr_image_base64 = generate_qr_code_base64(code_value=qr.code_value)
            result.append({
                "id": qr.id,
                "code_value": qr.code_value,
                "status": qr.status,
                "entity_type": qr.entity_type,
                "created_at": qr.created_at,
                "updated_at": qr.updated_at,
                "qr_image": qr_image_base64
            })
        
        logger.info(f"Batch of {batch_data.count} QR codes created by user {current_user.username}")
        
        return result
    
    except Exception as e:
        logger.error(f"Error generating QR code batch: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating QR code batch: {str(e)}"
        )

@router.get("/image/{code_value}")
async def get_qr_code_image(
    code_value: str,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    Get a QR code image by code value
    Returns the image as PNG
    """
    # Check if QR code exists
    qr_code = db.query(QRCode).filter(QRCode.code_value == code_value).first()
    if not qr_code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"QR code with value {code_value} not found"
        )
    
    # Generate QR code image
    _, img_bytes = generate_qr_code(code_value=code_value)
    
    # Return image
    return StreamingResponse(io.BytesIO(img_bytes), media_type="image/png")

@router.post("/download", response_model=QRCodeDownload)
async def download_qr_codes(
    qr_ids: List[uuid.UUID],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(check_role(["admin", "supervisor", "manager"]))
):
    """
    Generate a ZIP file containing QR code images for the specified QR codes
    """
    from zipfile import ZipFile, ZIP_DEFLATED
    import tempfile
    import os
    
    # Check if all QR codes exist
    qr_codes = db.query(QRCode).filter(QRCode.id.in_(qr_ids)).all()
    if len(qr_codes) != len(qr_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some QR codes were not found"
        )
    
    # Create temporary file for ZIP
    with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as temp_file:
        zip_path = temp_file.name
    
    # Generate ZIP file with QR codes
    with ZipFile(zip_path, 'w', ZIP_DEFLATED) as zip_file:
        for qr in qr_codes:
            # Generate QR code image
            _, img_bytes = generate_qr_code(code_value=qr.code_value)
            
            # Add to ZIP
            zip_file.writestr(f"{qr.code_value}.png", img_bytes)
    
    # Add cleanup task to remove the temporary file
    background_tasks.add_task(lambda: os.unlink(zip_path))
    
    logger.info(f"QR code download of {len(qr_codes)} codes created by user {current_user.username}")
    
    # Return download token (in a real app, this would be a URL)
    return {
        "download_path": zip_path,
        "filename": f"qrcodes_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.zip",
        "qr_count": len(qr_codes)
    }

@router.get("/download/{download_token}")
async def get_qr_codes_zip(
    download_token: str,
    current_user: User = Depends(get_user)
):
    """
    Download a ZIP file of QR codes using a download token
    """
    # In a real app, you would validate the token
    # For simplicity, we're using the file path as the token
    if not os.path.exists(download_token):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Download not found or expired"
        )
    
    # Read file
    with open(download_token, "rb") as f:
        content = f.read()
    
    # Create filename
    filename = f"qrcodes_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.zip"
    
    # Return file
    return Response(
        content=content,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.get("/validate/{code_value}")
async def validate_qr_code_endpoint(
    code_value: str,
    db: Session = Depends(get_db_dependency),
    current_user: User = Depends(get_user)
):
    """
    Validate a QR code's format and check if it exists in the database
    """
    # Validate format
    is_valid_format = validate_qr_code(code_value)
    
    # Check if exists in database
    exists_in_db = db.query(func.count(QRCode.id)).filter(QRCode.code_value == code_value).scalar() > 0
    
    # If it exists, get status
    status = None
    if exists_in_db:
        qr = db.query(QRCode).filter(QRCode.code_value == code_value).first()
        status = qr.status
    
    return {
        "code_value": code_value,
        "valid_format": is_valid_format,
        "exists_in_database": exists_in_db,
        "status": status
    }