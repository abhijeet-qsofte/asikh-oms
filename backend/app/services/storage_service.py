# app/services/storage_service.py
import os
import base64
import logging
import time
import uuid
from typing import Optional, Tuple
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
        
        # Early validation to prevent processing invalid data
        if not base64_data or len(base64_data) < 100:
            logger.warning(f"Invalid or empty base64 data for crate {crate_qr}")
            return None
            
        # Decode base64 data with error handling
        try:
            image_data = base64.b64decode(base64_data)
        except Exception as e:
            logger.error(f"Base64 decode error for crate {crate_qr}: {str(e)}")
            return None
        
        # Process image with size limit
        max_image_size = 5 * 1024 * 1024  # 5MB limit
        if len(image_data) > max_image_size:
            logger.warning(f"Image too large ({len(image_data)/1024/1024:.2f}MB) for crate {crate_qr}, applying extra compression")
            # Will apply extra compression in process_image
        
        # Process image with timeout protection
        try:
            processed_image_data, thumbnail_data = process_image(image_data, is_large=(len(image_data) > max_image_size))
        except Exception as e:
            logger.error(f"Image processing error for crate {crate_qr}: {str(e)}")
            # Use a placeholder image URL instead of failing
            placeholder_url = "images/placeholder_crate.jpg"
            
            # Update crate with placeholder
            crate = db_session.query(Crate).filter(Crate.qr_code == crate_qr).first()
            if crate:
                crate.photo_url = placeholder_url
                db_session.commit()
                logger.info(f"Updated crate {crate_qr} with placeholder due to processing error")
            
            return placeholder_url
        
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
        # Use a placeholder image rather than failing completely
        placeholder_url = "images/placeholder_crate.jpg"
        
        # Update crate with placeholder
        try:
            crate = db_session.query(Crate).filter(Crate.qr_code == crate_qr).first()
            if crate:
                crate.photo_url = placeholder_url
                db_session.commit()
                logger.info(f"Updated crate {crate_qr} with placeholder due to error")
        except Exception as inner_e:
            logger.error(f"Failed to update crate with placeholder: {str(inner_e)}")
        
        return placeholder_url


def process_image(image_data: bytes, is_large: bool = False) -> tuple:
    """
    Process image for optimal storage and display
    - Resize to maximum dimension
    - Correct orientation based on EXIF
    - Compress to reduce size
    - Generate thumbnail
    - Apply extra compression for large images
    Returns processed image data and thumbnail data
    """
    try:
        # Open image from binary data with a timeout
        start_time = time.time()
        img = Image.open(BytesIO(image_data))
        
        # Set processing timeout (3 seconds)
        if time.time() - start_time > 3:
            logger.warning("Image opening took too long, using simplified processing")
            # Apply simplified processing for timeout cases
            return simplified_image_processing(image_data)
        
        # Correct orientation based on EXIF data
        img = correct_image_orientation(img)
        
        # More aggressive resizing for large images
        max_size = settings.IMAGE_MAX_SIZE // 2 if is_large else settings.IMAGE_MAX_SIZE
        img = resize_image(img, max_size)
        
        # Create thumbnail
        thumb = create_thumbnail(img, settings.THUMBNAIL_SIZE)
        
        # Convert to bytes with compression
        # Use higher compression for large images
        quality = max(30, settings.IMAGE_QUALITY - 30) if is_large else settings.IMAGE_QUALITY
        
        img_bytes = BytesIO()
        img.save(img_bytes, format="JPEG", quality=quality, optimize=True)
        
        thumb_bytes = BytesIO()
        thumb.save(thumb_bytes, format="JPEG", quality=settings.IMAGE_QUALITY)
        
        # Check final size and compress further if still too large
        final_size = len(img_bytes.getvalue())
        if final_size > 1 * 1024 * 1024:  # If still larger than 1MB
            logger.warning(f"Image still large after processing ({final_size/1024/1024:.2f}MB), applying extra compression")
            img = img.resize((img.width // 2, img.height // 2), Image.LANCZOS)
            img_bytes = BytesIO()
            img.save(img_bytes, format="JPEG", quality=max(25, quality-10), optimize=True)
        
        return img_bytes.getvalue(), thumb_bytes.getvalue()
    
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        # Use simplified processing as fallback
        return simplified_image_processing(image_data)


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
                img = img.transpose(Image.FLIP_LEFT_RIGHT).rotate(90, expand=True)
            elif orientation == 6:
                img = img.rotate(270, expand=True)
            elif orientation == 7:
                img = img.transpose(Image.FLIP_LEFT_RIGHT).rotate(270, expand=True)
            elif orientation == 8:
                img = img.rotate(90, expand=True)
    except Exception as e:
        logger.warning(f"Could not correct image orientation: {str(e)}")
    
    return img


def simplified_image_processing(image_data: bytes) -> Tuple[bytes, bytes]:
    """
    Simplified image processing for fallback cases
    This is used when the normal processing fails or times out
    It applies minimal processing to ensure the operation completes quickly
    """
    try:
        # Try to open the image with a strict timeout approach
        img = None
        try:
            img = Image.open(BytesIO(image_data))
        except Exception as e:
            logger.error(f"Cannot open image in simplified processing: {str(e)}")
            # Return a tiny placeholder image if we can't even open it
            return create_placeholder_image()
        
        # Get original dimensions
        width, height = img.size
        
        # Calculate new dimensions (max 800px on longest side)
        max_dimension = 800
        if width > height:
            new_width = max_dimension
            new_height = int(height * (max_dimension / width))
        else:
            new_height = max_dimension
            new_width = int(width * (max_dimension / height))
        
        # Simple resize without any other processing
        img = img.resize((new_width, new_height), Image.NEAREST)
        
        # Create a very small thumbnail (100px)
        thumb_size = 100
        if width > height:
            thumb_width = thumb_size
            thumb_height = int(height * (thumb_size / width))
        else:
            thumb_height = thumb_size
            thumb_width = int(width * (thumb_size / height))
        
        thumb = img.resize((thumb_width, thumb_height), Image.NEAREST)
        
        # Convert to JPEG with high compression
        img_bytes = BytesIO()
        thumb_bytes = BytesIO()
        
        # Use lowest acceptable quality to ensure small size
        img.save(img_bytes, format="JPEG", quality=30, optimize=True)
        thumb.save(thumb_bytes, format="JPEG", quality=30, optimize=True)
        
        return img_bytes.getvalue(), thumb_bytes.getvalue()
        
    except Exception as e:
        logger.error(f"Simplified image processing failed: {str(e)}")
        return create_placeholder_image()


def create_placeholder_image() -> Tuple[bytes, bytes]:
    """
    Create a tiny placeholder image when all else fails
    """
    try:
        # Create a small colored image (200x200 px)
        img = Image.new('RGB', (200, 200), color=(200, 200, 200))
        
        # Add text if possible
        try:
            from PIL import ImageDraw, ImageFont
            draw = ImageDraw.Draw(img)
            draw.text((40, 80), "No Image\nAvailable", fill=(80, 80, 80))
        except Exception:
            # If text drawing fails, just use the blank image
            pass
        
        # Create an even smaller thumbnail
        thumb = img.resize((100, 100), Image.NEAREST)
        
        # Convert to bytes
        img_bytes = BytesIO()
        thumb_bytes = BytesIO()
        
        img.save(img_bytes, format="JPEG", quality=50)
        thumb.save(thumb_bytes, format="JPEG", quality=50)
        
        return img_bytes.getvalue(), thumb_bytes.getvalue()
    except Exception as e:
        logger.error(f"Failed to create placeholder image: {str(e)}")
        # Return minimal valid JPEG data as absolute fallback
        with open(os.path.join(os.path.dirname(__file__), "../static/placeholder.jpg"), "rb") as f:
            placeholder_data = f.read()
            return placeholder_data, placeholder_data


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
    Note: On Heroku, the filesystem is ephemeral, so files will be lost on dyno restart
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
        
        # Check file size before writing
        if len(file_data) > 5 * 1024 * 1024:  # 5MB
            logger.warning(f"File size too large for Heroku: {len(file_data)/1024/1024:.2f}MB")
            # Return a placeholder instead
            return "images/placeholder_crate.jpg"
        
        # Write file with a timeout protection
        try:
            with open(file_path, 'wb') as f:
                f.write(file_data)
        except Exception as e:
            logger.error(f"Error writing file to disk: {str(e)}")
            return "images/placeholder_crate.jpg"
        
        # Return relative path for URL
        rel_path = os.path.join("storage", now.strftime("%Y"), now.strftime("%m"), filename)
        return rel_path.replace("\\", "/")  # Ensure forward slashes for URLs
    
    except Exception as e:
        logger.error(f"Error storing file locally: {str(e)}")
        return "images/placeholder_crate.jpg"


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