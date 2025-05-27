# main.py
import uvicorn
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.staticfiles import StaticFiles
import time
import os
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import check_database_connection, Base, engine
import app.core.database as database
from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.api.routes.qr_code import router as qr_codes_router
from app.api.routes.crates import router as crates_router
from app.api.routes.batches import router as batches_router
from app.api.routes.reconciliation import router as reconciliation_router
from app.api.routes.farms import router as farms_router
from app.api.routes.packhouses import router as packhouses_router
from app.api.routes.varieties import router as varieties_router

# Configure logging - test change
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format=settings.LOG_FORMAT
)
logger = logging.getLogger(__name__)

# Set authentication bypass flag (default to True for development)
BYPASS_AUTH = os.environ.get('BYPASS_AUTH', 'true').lower() == 'true'
logger.warning(f"Authentication bypass is {'ENABLED' if BYPASS_AUTH else 'DISABLED'}")

# Update the bypass flag in the bypass_auth module
try:
    from app.core.bypass_auth import BYPASS_AUTHENTICATION
    import app.core.bypass_auth as bypass_auth
    bypass_auth.BYPASS_AUTHENTICATION = BYPASS_AUTH
except ImportError:
    logger.warning("Could not import bypass_auth module")

# Request processing time middleware
class ProcessTimeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = f"{process_time:.4f}"
        return response

# Lifespan event handler for startup/shutdown tasks
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    logger.info("Starting Asikh OMS API")
    
    # Check database connection during startup
    if not check_database_connection():
        logger.error("Failed to connect to database, check connection settings")
    else:
        logger.info("Database connection successful")
        # Create tables if they don't exist
        Base.metadata.create_all(bind=engine)
    
    yield
    
    # Shutdown tasks
    logger.info("Shutting down Asikh OMS API")

app = FastAPI(
    title="Asikh OMS API",
    description="API for Asikh Order Management System for mango harvesting",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS] or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add GZip compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Add request processing time middleware
app.add_middleware(ProcessTimeMiddleware)

# Catch-all HTTP middleware for exceptions
@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# Include all routers
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(users_router, prefix=f"{settings.API_V1_STR}/users", tags=["Users"])
app.include_router(qr_codes_router, prefix=f"{settings.API_V1_STR}/qr-codes", tags=["QR Codes"])
app.include_router(crates_router, prefix=f"{settings.API_V1_STR}/crates", tags=["Crates"])
app.include_router(batches_router, prefix=f"{settings.API_V1_STR}/batches", tags=["Batches"])
app.include_router(reconciliation_router, prefix=f"{settings.API_V1_STR}/reconciliation", tags=["Reconciliation"])
app.include_router(farms_router, prefix=f"{settings.API_V1_STR}/farms", tags=["Farms"])
app.include_router(packhouses_router, prefix=f"{settings.API_V1_STR}/packhouses", tags=["Packhouses"])
app.include_router(varieties_router, prefix=f"{settings.API_V1_STR}/varieties", tags=["Varieties"])

# Add static file serving for the images directory
app.mount("/images", StaticFiles(directory="images"), name="images")

@app.get("/", tags=["Health"])
async def root():
    return {"message": "Asikh OMS API is running", "status": "healthy"}

@app.get("/health", tags=["Health"])
async def health_check():
    db_status = "healthy" if database.check_database_connection() else "unhealthy"
    return {
        "status": "healthy",
        "components": {
            "api": "healthy",
            "database": db_status
        },
        "version": "1.0.0"
    }

# Error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)