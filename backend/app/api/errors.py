# app/api/errors.py
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from jose import JWTError
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Custom HTTP exception class with structured error response
class APIException(HTTPException):
    def __init__(
        self, 
        status_code: int, 
        detail: str,
        code: str = None,
        headers: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.code = code or "api_error"

# Error handler for validation errors
async def validation_error_handler(request: Request, exc: RequestValidationError):
    """
    Handle validation errors from FastAPI
    """
    logger.warning(f"Validation error: {str(exc)}")
    errors = []
    
    for error in exc.errors():
        error_msg = error.get("msg", "")
        error_loc = " -> ".join([str(loc) for loc in error.get("loc", [])])
        errors.append(f"{error_loc}: {error_msg}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "code": "validation_error",
            "message": "Input validation error",
            "details": errors
        }
    )

# Error handler for Pydantic validation errors
async def pydantic_validation_error_handler(request: Request, exc: ValidationError):
    """
    Handle validation errors from Pydantic models
    """
    logger.warning(f"Pydantic validation error: {str(exc)}")
    errors = []
    
    for error in exc.errors():
        error_msg = error.get("msg", "")
        error_loc = " -> ".join([str(loc) for loc in error.get("loc", [])])
        errors.append(f"{error_loc}: {error_msg}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "code": "validation_error",
            "message": "Data validation error",
            "details": errors
        }
    )

# Error handler for custom API exceptions
async def api_exception_handler(request: Request, exc: APIException):
    """
    Handle custom API exceptions
    """
    logger.warning(f"API exception: {exc.code} - {exc.detail}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": exc.code,
            "message": exc.detail
        },
        headers=exc.headers
    )

# Error handler for generic HTTP exceptions
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Handle regular HTTP exceptions
    """
    logger.warning(f"HTTP exception: {exc.status_code} - {exc.detail}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": "http_error",
            "message": exc.detail
        },
        headers=exc.headers
    )

# Error handler for JWT errors
async def jwt_error_handler(request: Request, exc: JWTError):
    """
    Handle JWT validation errors
    """
    logger.warning(f"JWT error: {str(exc)}")
    
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={
            "code": "authentication_error",
            "message": "Invalid authentication credentials"
        },
        headers={"WWW-Authenticate": "Bearer"}
    )

# Error handler for SQLAlchemy database errors
async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError):
    """
    Handle database errors
    """
    error_message = str(exc)
    logger.error(f"Database error: {error_message}")
    
    # For integrity errors, provide a clearer message
    if isinstance(exc, IntegrityError):
        if "unique constraint" in error_message.lower():
            return JSONResponse(
                status_code=status.HTTP_409_CONFLICT,
                content={
                    "code": "conflict_error",
                    "message": "A record with this data already exists"
                }
            )
        
        if "foreign key constraint" in error_message.lower():
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "code": "reference_error",
                    "message": "Referenced entity does not exist"
                }
            )
    
    # Generic database error
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "code": "database_error",
            "message": "A database error occurred"
        }
    )

# Error handler for all other exceptions
async def general_exception_handler(request: Request, exc: Exception):
    """
    Handle all unhandled exceptions
    """
    path = request.url.path
    method = request.method
    error_message = str(exc)
    
    logger.error(f"Unhandled exception on {method} {path}: {error_message}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "code": "server_error",
            "message": "An unexpected error occurred"
        }
    )

# Register all error handlers with FastAPI
def register_exception_handlers(app):
    """
    Register all exception handlers with the FastAPI app
    """
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(ValidationError, pydantic_validation_error_handler)
    app.add_exception_handler(APIException, api_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(JWTError, jwt_error_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_error_handler)
    app.add_exception_handler(Exception, general_exception_handler)