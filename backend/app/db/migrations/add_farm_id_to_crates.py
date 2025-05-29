"""
Migration script to add farm_id column to the crates table
"""
from sqlalchemy import Column, ForeignKey, MetaData, Table, text
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import engine

def add_farm_id_to_crates():
    """Add farm_id column to crates table with a foreign key to farms table"""
    
    # Create a metadata object
    metadata = MetaData()
    
    # Add the column to the table using text() for raw SQL
    with engine.begin() as conn:
        # Add farm_id column if it doesn't exist
        conn.execute(text("ALTER TABLE crates ADD COLUMN IF NOT EXISTS farm_id UUID"))
        
        # Add foreign key constraint
        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'fk_crates_farm_id'
                ) THEN
                    ALTER TABLE crates 
                    ADD CONSTRAINT fk_crates_farm_id 
                    FOREIGN KEY (farm_id) 
                    REFERENCES farms(id);
                END IF;
            END
            $$;
        """))
    
    print("Added farm_id column to crates table with foreign key constraint successfully")

if __name__ == "__main__":
    add_farm_id_to_crates()
