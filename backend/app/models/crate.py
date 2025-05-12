# app/models/crate.py
import uuid
from sqlalchemy import Column, String, Float, Text, DateTime, ForeignKey, func, PrimaryKeyConstraint, UniqueConstraint, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base

class Crate(Base):
    __tablename__ = "crates"
    __table_args__ = (
        PrimaryKeyConstraint('id', 'harvest_date'),
        UniqueConstraint('qr_code', 'harvest_date', name='uq_crates_qr_code_harvest_date'),
        # Partitioning removed: allow all harvest_date values in this table
    )
    
    id = Column(UUID(as_uuid=True), default=uuid.uuid4, nullable=False)
    qr_code = Column(String(100), ForeignKey("qr_codes.code_value"), index=True, nullable=False)
    harvest_date = Column(DateTime, primary_key=True, default=func.now(), nullable=False, index=True)
    gps_location = Column(JSONB, nullable=True)
    photo_url = Column(String(255), nullable=True)
    supervisor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    weight = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    variety_id = Column(UUID(as_uuid=True), ForeignKey("varieties.id"), nullable=False)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id"), nullable=True)
    quality_grade = Column(String(10), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    qr_code_obj = relationship("QRCode", back_populates="crate")
    supervisor_user = relationship("User", back_populates="crates_supervised", foreign_keys=[supervisor_id])
    variety_obj = relationship("Variety", back_populates="crates")
    batch = relationship("Batch", back_populates="crates")
    reconciliation_logs = relationship("ReconciliationLog", back_populates="crate")
    
    def __repr__(self):
        return f"<Crate {self.qr_code}>"