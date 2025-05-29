"""Add photo_url, latitude, and longitude to Batch model

Revision ID: 9a3b7c8d6e5f
Revises: 597154d7d29a
Create Date: 2025-05-30 02:20:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9a3b7c8d6e5f'
down_revision = '597154d7d29a'
branch_labels = None
depends_on = None


def upgrade():
    # Add photo_url column if it doesn't exist
    op.execute("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'batches' AND column_name = 'photo_url') THEN
            ALTER TABLE batches ADD COLUMN photo_url VARCHAR;
        END IF;
    END
    $$;
    """)
    
    # Add latitude column if it doesn't exist
    op.execute("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'batches' AND column_name = 'latitude') THEN
            ALTER TABLE batches ADD COLUMN latitude FLOAT;
        END IF;
    END
    $$;
    """)
    
    # Add longitude column if it doesn't exist
    op.execute("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'batches' AND column_name = 'longitude') THEN
            ALTER TABLE batches ADD COLUMN longitude FLOAT;
        END IF;
    END
    $$;
    """)
    
    # Update existing records to have default values for the new required fields
    op.execute("""
    UPDATE batches 
    SET 
        latitude = 0.0,
        longitude = 0.0
    WHERE 
        latitude IS NULL OR longitude IS NULL;
    """)
    
    # Make the columns non-nullable after setting default values
    op.execute("""
    ALTER TABLE batches ALTER COLUMN latitude SET NOT NULL;
    ALTER TABLE batches ALTER COLUMN longitude SET NOT NULL;
    """)


def downgrade():
    # Make columns nullable first to avoid constraint violations
    op.execute("ALTER TABLE batches ALTER COLUMN latitude DROP NOT NULL;")
    op.execute("ALTER TABLE batches ALTER COLUMN longitude DROP NOT NULL;")
    
    # Remove the columns
    op.drop_column('batches', 'longitude')
    op.drop_column('batches', 'latitude')
    op.drop_column('batches', 'photo_url')
