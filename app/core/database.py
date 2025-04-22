# app/core/database.py
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from contextlib import contextmanager
from typing import Generator
import logging

from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)

# Create SQLAlchemy engine with connection pooling
engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URI,
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