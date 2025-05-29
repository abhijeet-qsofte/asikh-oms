"""Add photo_url, latitude, and longitude to Batch model

Revision ID: 9a3b7c8d6e5f
Revises: 597154d7d29a
Create Date: 2025-05-30 02:06:32

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9a3b7c8d6e5f'
down_revision = '597154d7d29a'
branch_labels = None
depends_on = None


def upgrade():
    # Add photo_url column
    op.add_column('batches', sa.Column('photo_url', sa.String(), nullable=True))
    
    # Add latitude and longitude columns
    op.add_column('batches', sa.Column('latitude', sa.Float(), nullable=True))
    op.add_column('batches', sa.Column('longitude', sa.Float(), nullable=True))
    
    # Initially set nullable to True to allow existing records to work
    # Later we can update the existing records and set nullable to False if needed


def downgrade():
    # Remove the columns in reverse order
    op.drop_column('batches', 'longitude')
    op.drop_column('batches', 'latitude')
    op.drop_column('batches', 'photo_url')
