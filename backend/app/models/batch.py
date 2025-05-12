# app/models/batch.py
import uuid
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base

class Batch(Base):
    __tablename__ = "batches"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    batch_code = Column(String(100), unique=True, index=True, nullable=False)
    supervisor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    transport_mode = Column(String(50), nullable=False)
    from_location = Column(UUID(as_uuid=True), ForeignKey("farms.id"), nullable=False)
    to_location = Column(UUID(as_uuid=True), ForeignKey("packhouses.id"), nullable=False)
    vehicle_number = Column(String(50), nullable=True)
    driver_name = Column(String(100), nullable=True)
    eta = Column(DateTime, nullable=True)
    departure_time = Column(DateTime, nullable=True)
    arrival_time = Column(DateTime, nullable=True)
    status = Column(String(50), default="open")
    total_crates = Column(Integer, default=0)
    total_weight = Column(Float, default=0)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    supervisor_user = relationship("User", back_populates="batches_supervised", foreign_keys=[supervisor_id])
    from_location_obj = relationship("Farm", back_populates="batches", foreign_keys=[from_location])
    to_location_obj = relationship("Packhouse", back_populates="batches", foreign_keys=[to_location])
    crates = relationship("Crate", back_populates="batch")
    reconciliation_logs = relationship("ReconciliationLog", back_populates="batch")
    crate_reconciliations = relationship("CrateReconciliation", back_populates="batch")
    
    def __repr__(self):
        return f"<Batch {self.batch_code}>"