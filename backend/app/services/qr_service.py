# app/services/qr_service.py
import qrcode
import uuid
import re
import io
import base64
import logging
from typing import Optional, Tuple
from PIL import Image
from sqlalchemy.orm import Session

from app.models.qr_code import QRCode
from app.core.config import settings

logger = logging.getLogger(__name__)

# QR code format: ASIKH-{prefix}-{uuid}
QR_CODE_PATTERN = r"^ASIKH-(CRATE|BATCH)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
QR_CODE_REGEX = re.compile(QR_CODE_PATTERN, re.IGNORECASE)

def generate_qr_code(prefix: str = "CRATE", code_value: Optional[str] = None) -> Tuple[str, bytes]:
    """
    Generate a QR code with the specified prefix and optional code value
    Returns tuple of (code_value, qr_code_image_bytes)
    """
    if code_value is None:
        # Generate a new code value if not provided
        code_value = f"ASIKH-{prefix}-{str(uuid.uuid4())}"
    
    # Validate the format
    if not QR_CODE_REGEX.match(code_value):
        raise ValueError(f"Invalid QR code format: {code_value}")
    
    # Create QR code
    qr = qrcode.QRCode(
        version=settings.QR_CODE_VERSION,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=settings.QR_CODE_BOX_SIZE,
        border=settings.QR_CODE_BORDER,
    )
    
    qr.add_data(code_value)
    qr.make(fit=True)
    
    # Create image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes = img_bytes.getvalue()
    
    return code_value, img_bytes


def generate_qr_code_base64(prefix: str = "CRATE", code_value: Optional[str] = None) -> Tuple[str, str]:
    """
    Generate a QR code and return as base64 encoded string
    Returns tuple of (code_value, qr_code_base64)
    """
    code_value, img_bytes = generate_qr_code(prefix, code_value)
    
    # Convert to base64
    img_base64 = base64.b64encode(img_bytes).decode('ascii')
    
    return code_value, f"data:image/png;base64,{img_base64}"


def batch_generate_qr_codes(
    db: Session, 
    count: int, 
    prefix: str = "CRATE", 
    entity_type: str = "crate"
) -> list[QRCode]:
    """
    Generate a batch of QR codes and store them in the database
    Returns list of QRCode objects
    """
    qr_codes = []
    
    for _ in range(count):
        code_value, _ = generate_qr_code(prefix)
        
        # Create QR code record
        qr_code = QRCode(
            code_value=code_value,
            status="active",
            entity_type=entity_type
        )
        
        db.add(qr_code)
        qr_codes.append(qr_code)
    
    # Commit to database
    db.commit()
    
    logger.info(f"Generated {count} QR codes with prefix {prefix}")
    
    return qr_codes


def validate_qr_code(code_value: str) -> bool:
    """
    Validate QR code format
    """
    return bool(QR_CODE_REGEX.match(code_value))


def check_qr_code_status(db: Session, code_value: str) -> Optional[str]:
    """
    Check QR code status in database
    Returns status if found, None if not found
    """
    qr_code = db.query(QRCode).filter(QRCode.code_value == code_value).first()
    
    if not qr_code:
        return None
    
    return qr_code.status


def update_qr_code_status(db: Session, code_value: str, status: str) -> bool:
    """
    Update QR code status in database
    Returns True if successful, False if not found
    """
    qr_code = db.query(QRCode).filter(QRCode.code_value == code_value).first()
    
    if not qr_code:
        return False
    
    qr_code.status = status
    db.commit()
    
    return True