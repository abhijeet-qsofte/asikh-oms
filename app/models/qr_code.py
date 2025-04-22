import uuid
from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base

class QRCode(Base):
    __tablename__ = "qr_codes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code_value = Column(String(100), unique=True, index=True, nullable=False)
    status = Column(String(50), default="active")
    entity_type = Column(String(50), default="crate")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    crate = relationship("Crate", back_populates="qr_code_obj", uselist=False)
    reconciliation_logs = relationship("ReconciliationLog", back_populates="qr_code_obj", foreign_keys="ReconciliationLog.scanned_qr")
    
    def __repr__(self):
        return f"<QRCode {self.code_value}>"