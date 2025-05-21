# app/core/database.py
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from contextlib import contextmanager
from typing import Generator
import logging
import os

from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)

# Get database URL - use Heroku's DATABASE_URL if available, otherwise use settings
database_url = os.getenv("DATABASE_URL", settings.SQLALCHEMY_DATABASE_URI)

# Heroku provides PostgreSQL URLs starting with postgres://, but SQLAlchemy 1.4+ requires postgresql://
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)
    logger.info("Converted postgres:// URL to postgresql:// for SQLAlchemy compatibility")

logger.info(f"Using database connection: {database_url.split('@')[0].split('://')[0]}://*****@{database_url.split('@')[1] if '@' in database_url else 'localhost'}")

# Create SQLAlchemy engine with connection pooling
engine = create_engine(
    database_url,
    pool_pre_ping=True,  # Verify connections before using them
    pool_size=settings.POOL_SIZE,  # Maximum number of persistent connections
    max_overflow=settings.MAX_OVERFLOW,  # Maximum number of connections that can be created beyond pool_size
    pool_timeout=settings.POOL_TIMEOUT,  # Seconds to wait before giving up on getting a connection
    pool_recycle=settings.POOL_RECYCLE,  # Seconds after which a connection is automatically recycled
    echo=False,  # Set to True to log all SQL statements (development only)
    future=True,
)

# Create session factory (SQLAlchemy 2.0 API)
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    future=True,
)

# Base class for SQLAlchemy models
Base = declarative_base()

@contextmanager
def get_db() -> Generator:
    """
    Get a database session as a context manager.
    This ensures proper cleanup of resources.
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Database error: {str(e)}")
        raise
    finally:
        db.close()

def get_db_dependency() -> Generator:
    """
    FastAPI dependency for database sessions.
    Use this with Depends() in route functions.
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Database error: {str(e)}")
        raise
    finally:
        db.close()

# Health check function
def check_database_connection() -> bool:
    """
    Check if database connection is working.
    Used for health checks.
    """
    try:
        with engine.connect() as conn:
            # Wrap raw SQL in a TextClause
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database connection error: {str(e)}")
        return False