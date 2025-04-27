# app/models/__init__.py
from sqlalchemy import Column, DateTime, func
from sqlalchemy.ext.declarative import declared_attr, as_declarative
import re

# Register all models to ensure SQLAlchemy maps string references
from app.models.user import User
from app.models.qr_code import QRCode
from app.models.crate import Crate
from app.models.batch import Batch
from app.models.farm import Farm
from app.models.packhouse import Packhouse
from app.models.variety import Variety
from app.models.reconciliation import ReconciliationLog

@as_declarative()
class Base:
    """Base class for all models"""
    
    # Generate __tablename__ automatically based on class name
    @declared_attr
    def __tablename__(cls) -> str:
        # Convert CamelCase to snake_case for table names
        s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', cls.__name__)
        return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

    # Common columns for all models
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Method to convert model instance to dictionary
    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}