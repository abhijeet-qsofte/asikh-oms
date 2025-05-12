"""
Migration script to add weight differential columns to the crate_reconciliations table
"""
from sqlalchemy import Column, Float, MetaData, Table, text
from app.core.database import engine

def add_weight_differential_columns():
    """Add original_weight and weight_differential columns to crate_reconciliations table"""
    
    # Create a metadata object
    metadata = MetaData()
    
    # Add the columns to the table using text() for raw SQL
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE crate_reconciliations ADD COLUMN IF NOT EXISTS original_weight FLOAT"))
        conn.execute(text("ALTER TABLE crate_reconciliations ADD COLUMN IF NOT EXISTS weight_differential FLOAT"))
    
    print("Added original_weight and weight_differential columns to crate_reconciliations table successfully")

if __name__ == "__main__":
    add_weight_differential_columns()
