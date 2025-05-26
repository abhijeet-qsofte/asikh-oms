# app/models/user.py
import uuid
from sqlalchemy import Boolean, Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.crate import Crate
from app.models.batch import Batch
from app.models.reconciliation import ReconciliationLog, CrateReconciliation

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    pin = Column(String(255), nullable=True)  # Hashed PIN for mobile authentication
    pin_set_at = Column(DateTime, nullable=True)  # When the PIN was last set
    role = Column(String(50), nullable=False)
    full_name = Column(String(100), nullable=True)
    active = Column(Boolean, default=True)
    phone_number = Column(String(20), nullable=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    crates_supervised = relationship(
        Crate, back_populates="supervisor_user", foreign_keys=[Crate.supervisor_id]
    )
    batches_supervised = relationship(
        Batch, back_populates="supervisor_user", foreign_keys=[Batch.supervisor_id]
    )
    reconciliation_logs = relationship(
        ReconciliationLog, back_populates="scanned_by_user", foreign_keys=[ReconciliationLog.scanned_by_id]
    )
    crate_reconciliations = relationship(
        CrateReconciliation, foreign_keys=[CrateReconciliation.reconciled_by_id],
        overlaps="reconciled_by"
    )
    
    def __repr__(self):
        return f"<User {self.username}>"