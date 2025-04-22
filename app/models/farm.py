import uuid
from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base

class Farm(Base):
    __tablename__ = "farms"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    location = Column(String(255), nullable=True)
    gps_coordinates = Column(JSONB, nullable=True)
    owner = Column(String(100), nullable=True)
    contact_info = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    batches = relationship("Batch", back_populates="from_location_obj", foreign_keys="Batch.from_location")
    
    def __repr__(self):
        return f"<Farm {self.name}>"