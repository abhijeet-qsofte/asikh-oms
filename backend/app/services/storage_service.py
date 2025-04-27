# app/services/storage_service.py
import os
import base64
import logging
import uuid
from typing import Optional
from io import BytesIO
from PIL import Image, ExifTags
from sqlalchemy.orm import Session
import boto3
from botocore.exceptions import ClientError
import io

from app.core.config import settings
from app.models.crate import Crate

logger = logging.getLogger(__name__)

# Supported storage providers
STORAGE_LOCAL = "local"
STORAGE_S3 = "s3"
STORAGE_AZURE = "azure"

def save_image(base64_data: str, filename: str, crate_qr: str, db_session: Session) -> Optional[str]:
    """
    Save image to storage and update crate record
    This function handles:
    1. Decoding base64 data
    2. Image processing (resize, compression)
    3. Saving to the configured storage
    4. Updating the crate record with the final URL
    """
    try:
        # Remove base64 header if present
        if "," in base64_data:
            base64_data = base64_data.split(",")[1]
            
        # Decode base64 data
        image_data = base64.b64decode(base64_data)
        
        # Process image
        processed_image_data, thumbnail_data = process_image(image_data)
        
        # Save to storage and get URL
        image_url = store_file(processed_image_data, filename)
        
        # Save thumbnail with _thumb suffix
        thumbnail_filename = f"{os.path.splitext(filename)[0]}_thumb{os.path.splitext(filename)[1]}"
        thumbnail_url = store_file(thumbnail_data, thumbnail_filename)
        
        # Update crate record with the final URL
        crate = db_session.query(Crate).filter(Crate.qr_code == crate_qr).first()
        if crate:
            crate.photo_url = image_url
            db_session.commit()
            logger.info(f"Updated crate {crate_qr} with photo URL: {image_url}")
        
        return image_url
    
    except Exception as e:
        logger.error(f"Error saving image: {str(e)}")
        return None


def process_image(image_data: bytes) -> tuple:
    """
    Process image for optimal storage and display
    - Resize to maximum dimension
    - Correct orientation based on EXIF
    - Compress to reduce size
    - Generate thumbnail
    Returns processed image data and thumbnail data
    """
    try:
        # Open image from binary data
        img = Image.open(BytesIO(image_data))
        
        # Correct orientation based on EXIF data
        img = correct_image_orientation(img)
        
        # Resize image if larger than max dimension
        img = resize_image(img, settings.IMAGE_MAX_SIZE)
        
        # Create thumbnail
        thumb = create_thumbnail(img, settings.THUMBNAIL_SIZE)
        
        # Convert to bytes with compression
        img_bytes = BytesIO()
        img.save(img_bytes, format="JPEG", quality=settings.IMAGE_QUALITY)
        
        thumb_bytes = BytesIO()
        thumb.save(thumb_bytes, format="JPEG", quality=settings.IMAGE_QUALITY)
        
        return img_bytes.getvalue(), thumb_bytes.getvalue()
    
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        # Return original data if processing fails
        return image_data, image_data


def correct_image_orientation(img: Image.Image) -> Image.Image:
    """
    Correct image orientation based on EXIF data
    """
    try:
        # Check if image has EXIF data
        if hasattr(img, '_getexif') and img._getexif():
            exif = dict((ExifTags.TAGS.get(k, k), v) for k, v in img._getexif().items())
            
            # Get orientation tag
            orientation = exif.get('Orientation', 0)
            
            # Apply transformations based on orientation
            if orientation == 2:
                img = img.transpose(Image.FLIP_LEFT_RIGHT)
            elif orientation == 3:
                img = img.rotate(180)
            elif orientation == 4:
                img = img.transpose(Image.FLIP_TOP_BOTTOM)
            elif orientation == 5:
                img = img.transpose(Image.FLIP_LEFT_RIGHT).rotate(90)
            elif orientation == 6:
                img = img.rotate(270)
            elif orientation == 7:
                img = img.transpose(Image.FLIP_LEFT_RIGHT).rotate(270)
            elif orientation == 8:
                img = img.rotate(90)
    except Exception as e:
        logger.warning(f"Could not correct image orientation: {str(e)}")
    
    return img


def resize_image(img: Image.Image, max_size: int) -> Image.Image:
    """
    Resize image if larger than max dimension while preserving aspect ratio
    """
    width, height = img.size
    
    if width <= max_size and height <= max_size:
        return img
    
    if width > height:
        new_width = max_size
        new_height = int(height * (max_size / width))
    else:
        new_height = max_size
        new_width = int(width * (max_size / height))
    
    return img.resize((new_width, new_height), Image.LANCZOS)


def create_thumbnail(img: Image.Image, thumb_size: int) -> Image.Image:
    """
    Create a thumbnail version of the image
    """
    width, height = img.size
    
    if width > height:
        new_width = thumb_size
        new_height = int(height * (thumb_size / width))
    else:
        new_height = thumb_size
        new_width = int(width * (thumb_size / height))
    
    return img.resize((new_width, new_height), Image.LANCZOS)


def store_file(file_data: bytes, filename: str) -> str:
    """
    Store file using the configured storage provider
    Returns the URL or path to the stored file
    """
    storage_service = settings.STORAGE_SERVICE.lower()
    
    if storage_service == STORAGE_LOCAL:
        return store_file_local(file_data, filename)
    elif storage_service == STORAGE_S3:
        return store_file_s3(file_data, filename)
    elif storage_service == STORAGE_AZURE:
        return store_file_azure(file_data, filename)
    else:
        logger.error(f"Unsupported storage service: {storage_service}")
        # Fall back to local storage
        return store_file_local(file_data, filename)


def store_file_local(file_data: bytes, filename: str) -> str:
    """
    Store file in local filesystem
    """
    try:
        # Create directory if it doesn't exist
        os.makedirs(settings.LOCAL_STORAGE_PATH, exist_ok=True)
        
        # Organize files by date (YYYY/MM)
        from datetime import datetime
        now = datetime.utcnow()
        date_path = os.path.join(settings.LOCAL_STORAGE_PATH, now.strftime("%Y"), now.strftime("%m"))
        os.makedirs(date_path, exist_ok=True)
        
        # Full path including filename
        file_path = os.path.join(date_path, filename)
        
        # Write file
        with open(file_path, 'wb') as f:
            f.write(file_data)
        
        # Return relative path for URL
        rel_path = os.path.join("storage", now.strftime("%Y"), now.strftime("%m"), filename)
        return rel_path.replace("\\", "/")  # Ensure forward slashes for URLs
    
    except Exception as e:
        logger.error(f"Error storing file locally: {str(e)}")
        return ""


def store_file_s3(file_data: bytes, filename: str) -> str:
    """
    Store file in AWS S3
    """
    try:
        # Create S3 client
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.STORAGE_ACCESS_KEY,
            aws_secret_access_key=settings.STORAGE_SECRET_KEY,
            region_name=settings.STORAGE_REGION,
            endpoint_url=settings.STORAGE_ENDPOINT,
        )
        
        # Organize files by date (YYYY/MM)
        from datetime import datetime
        now = datetime.utcnow()
        s3_key = f"{now.strftime('%Y')}/{now.strftime('%m')}/{filename}"
        
        # Upload file
        s3_client.upload_fileobj(
            BytesIO(file_data),
            settings.STORAGE_BUCKET_NAME,
            s3_key,
            ExtraArgs={'ContentType': 'image/jpeg'}
        )
        
        # Generate URL
        if settings.STORAGE_ENDPOINT:
            # Custom endpoint
            url = f"{settings.STORAGE_ENDPOINT}/{settings.STORAGE_BUCKET_NAME}/{s3_key}"
        else:
            # Standard AWS S3
            url = f"https://{settings.STORAGE_BUCKET_NAME}.s3.{settings.STORAGE_REGION}.amazonaws.com/{s3_key}"
        
        return url
    
    except Exception as e:
        logger.error(f"Error storing file in S3: {str(e)}")
        return ""


def store_file_azure(file_data: bytes, filename: str) -> str:
    """
    Store file in Azure Blob Storage
    """
    try:
        # This is a placeholder for Azure Blob Storage implementation
        # In a real implementation, you would use azure-storage-blob package
        logger.warning("Azure Blob Storage not fully implemented, using local storage")
        return store_file_local(file_data, filename)
    
    except Exception as e:
        logger.error(f"Error storing file in Azure: {str(e)}")
        return ""


def get_file_url(path: str) -> str:
    """
    Get the full URL for a file path based on storage provider
    """
    storage_service = settings.STORAGE_SERVICE.lower()
    
    if storage_service == STORAGE_LOCAL:
        # For local storage, prepend the base URL
        # This assumes the local storage is served via a web server
        base_url = settings.API_BASE_URL if hasattr(settings, 'API_BASE_URL') else ""
        return f"{base_url}/{path}"
    else:
        # For cloud storage, the path is already a full URL
        return path