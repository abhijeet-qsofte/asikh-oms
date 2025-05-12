"""
Migration script to create the crate_reconciliations table
"""
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Float, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.schema import ForeignKeyConstraint
from app.core.database import Base, engine

def create_crate_reconciliation_table():
    """Create the crate_reconciliations table"""
    
    # Define the table structure
    class CrateReconciliation(Base):
        __tablename__ = "crate_reconciliations"
        
        id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
        batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id"), nullable=False, index=True)
        crate_id = Column(UUID(as_uuid=True), nullable=False, index=True)
        crate_harvest_date = Column(DateTime, nullable=True)
        qr_code = Column(String(100), ForeignKey("qr_codes.code_value"), index=True)
        reconciled_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
        reconciled_at = Column(DateTime, nullable=False)
        weight = Column(Float, nullable=True)
        photo_url = Column(String, nullable=True)
        notes = Column(String, nullable=True)
        is_reconciled = Column(Boolean, default=True, nullable=False)
        
        __table_args__ = (
            ForeignKeyConstraint(['crate_id', 'crate_harvest_date'], ['crates.id', 'crates.harvest_date'], name='fk_recon_crate'),
        )
    
    # Create the table
    Base.metadata.create_all(engine, tables=[CrateReconciliation.__table__])
    print("Created crate_reconciliations table successfully")

if __name__ == "__main__":
    create_crate_reconciliation_table()
