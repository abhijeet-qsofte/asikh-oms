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
        
        # Run migrations
        try:
            logger.info("Running database migrations")
            
            # 1. Migration to add weight differential columns
            logger.info("Running migration to add weight differential columns to crate_reconciliations table")
            from sqlalchemy import text, inspect
            
            # First check if the table exists
            inspector = inspect(engine)
            if 'crate_reconciliations' not in inspector.get_table_names():
                logger.warning("crate_reconciliations table does not exist yet, will be created with the columns")
            else:
                # Check if columns already exist
                columns = [c['name'] for c in inspector.get_columns('crate_reconciliations')]
                logger.info(f"Existing columns in crate_reconciliations: {columns}")
                
                # Add columns if they don't exist
                with engine.begin() as conn:
                    if 'original_weight' not in columns:
                        logger.info("Adding original_weight column to crate_reconciliations table")
                        conn.execute(text("ALTER TABLE crate_reconciliations ADD COLUMN original_weight FLOAT"))
                        logger.info("Successfully added original_weight column")
                    else:
                        logger.info("original_weight column already exists")
                    
                    if 'weight_differential' not in columns:
                        logger.info("Adding weight_differential column to crate_reconciliations table")
                        conn.execute(text("ALTER TABLE crate_reconciliations ADD COLUMN weight_differential FLOAT"))
                        logger.info("Successfully added weight_differential column")
                    else:
                        logger.info("weight_differential column already exists")
                        
                # Verify columns were added successfully
                updated_columns = [c['name'] for c in inspector.get_columns('crate_reconciliations')]
                logger.info(f"Updated columns in crate_reconciliations: {updated_columns}")
                
                if 'original_weight' not in updated_columns or 'weight_differential' not in updated_columns:
                    logger.warning("Migration may not have completed successfully. Some columns are still missing.")
                else:
                    logger.info("Migration completed successfully. All required columns exist.")
                    
                # Run a simple query to verify the columns work
                try:
                    result = conn.execute(text("SELECT COUNT(*) FROM crate_reconciliations")).scalar()
                    logger.info(f"Verified table access: crate_reconciliations has {result} rows")
                except Exception as e:
                    logger.error(f"Error accessing crate_reconciliations table: {str(e)}")
                    raise
                
                logger.info("Weight differential columns migration completed successfully")
                
            # 2. Migration to add farm_id column to crates table
            logger.info("Running migration to add farm_id column to crates table")
            
            # Check if crates table exists
            if 'crates' not in inspector.get_table_names():
                logger.warning("crates table does not exist yet, will be created with the farm_id column")
            else:
                # Check if column already exists
                crate_columns = [c['name'] for c in inspector.get_columns('crates')]
                logger.info(f"Existing columns in crates: {crate_columns}")
                
                # Add column if it doesn't exist
                with engine.begin() as conn:
                    if 'farm_id' not in crate_columns:
                        logger.info("Adding farm_id column to crates table")
                        conn.execute(text("ALTER TABLE crates ADD COLUMN farm_id UUID"))
                        
                        # Add foreign key constraint
                        logger.info("Adding foreign key constraint for farm_id")
                        conn.execute(text("""
                            DO $$
                            BEGIN
                                IF NOT EXISTS (
                                    SELECT 1 FROM pg_constraint WHERE conname = 'fk_crates_farm_id'
                                ) THEN
                                    ALTER TABLE crates 
                                    ADD CONSTRAINT fk_crates_farm_id 
                                    FOREIGN KEY (farm_id) 
                                    REFERENCES farms(id);
                                END IF;
                            END
                            $$;
                        """))
                        
                        logger.info("Successfully added farm_id column with foreign key constraint")
                    else:
                        logger.info("farm_id column already exists")
                
                # Verify column was added successfully
                updated_crate_columns = [c['name'] for c in inspector.get_columns('crates')]
                if 'farm_id' not in updated_crate_columns:
                    logger.warning("Migration may not have completed successfully. farm_id column is missing.")
                else:
                    logger.info("Farm ID migration completed successfully.")
                    
                # Run a simple query to verify the column works
                try:
                    result = conn.execute(text("SELECT COUNT(*) FROM crates WHERE farm_id IS NOT NULL")).scalar()
                    logger.info(f"Verified farm_id column: {result} crates have farm_id set")
                except Exception as e:
                    logger.error(f"Error accessing crates table farm_id column: {str(e)}")
                    # Don't raise exception here, continue with startup
        except Exception as e:
            import traceback
            error_traceback = traceback.format_exc()
            logger.error(f"Error running weight differential columns migration: {str(e)}")
            logger.error(f"Migration traceback: {error_traceback}")
            logger.warning("The application will continue to start, but reconciliation may not work correctly")
    
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