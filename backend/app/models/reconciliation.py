# app/models/reconciliation.py
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, func, PrimaryKeyConstraint, ForeignKeyConstraint, Float, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base

class ReconciliationLog(Base):
    __tablename__ = "reconciliation_logs"
    __table_args__ = (
        PrimaryKeyConstraint('id', 'timestamp'),
        ForeignKeyConstraint(['crate_id', 'crate_harvest_date'], ['crates.id', 'crates.harvest_date'], name='fk_recon_log_crate'),
        {'postgresql_partition_by': 'RANGE (timestamp)'},
    )
    
    id = Column(UUID(as_uuid=True), default=uuid.uuid4, nullable=False)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id"), nullable=False, index=True)
    scanned_qr = Column(String(100), ForeignKey("qr_codes.code_value"), index=True)
    crate_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    crate_harvest_date = Column(DateTime, nullable=True, index=True)
    status = Column(String(50), nullable=False, index=True)
    timestamp = Column(DateTime, primary_key=False, default=func.now(), nullable=False)
    scanned_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    location = Column(JSONB, nullable=True)
    device_info = Column(JSONB, nullable=True)
    notes = Column(String, nullable=True)
    
    # Relationships
    batch = relationship("Batch", back_populates="reconciliation_logs")
    qr_code_obj = relationship("QRCode", back_populates="reconciliation_logs", foreign_keys=[scanned_qr])
    crate = relationship("Crate", back_populates="reconciliation_logs")
    scanned_by_user = relationship("User", back_populates="reconciliation_logs", foreign_keys=[scanned_by_id])
    
    def __repr__(self):
        return f"<ReconciliationLog {self.id} status={self.status}>"


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    table_name = Column(String(50), nullable=False, index=True)
    record_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    action = Column(String(10), nullable=False)
    old_data = Column(JSONB, nullable=True)
    new_data = Column(JSONB, nullable=True)
    changed_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    timestamp = Column(DateTime, default=func.now(), index=True)
    
    # Relationships
    changed_by = relationship("User")
    
    def __repr__(self):
        return f"<AuditLog {self.table_name} {self.action}>"


class CrateReconciliation(Base):
    __tablename__ = "crate_reconciliations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id"), nullable=False, index=True)
    crate_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    crate_harvest_date = Column(DateTime, nullable=True)
    qr_code = Column(String(100), ForeignKey("qr_codes.code_value"), index=True)
    reconciled_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reconciled_at = Column(DateTime, default=func.now(), nullable=False)
    weight = Column(Float, nullable=True)
    original_weight = Column(Float, nullable=True)
    weight_differential = Column(Float, nullable=True)
    photo_url = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    is_reconciled = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    batch = relationship("Batch", back_populates="crate_reconciliations")
    qr_code_obj = relationship("QRCode", back_populates="reconciliations", foreign_keys=[qr_code])
    reconciled_by = relationship("User", back_populates="crate_reconciliations", foreign_keys=[reconciled_by_id])
    
    __table_args__ = (
        ForeignKeyConstraint(['crate_id', 'crate_harvest_date'], ['crates.id', 'crates.harvest_date'], name='fk_recon_crate'),
    )
    
    def __repr__(self):
        return f"<CrateReconciliation {self.id} crate={self.crate_id} weight={self.weight}>"