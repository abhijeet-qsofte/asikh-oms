"""add pin to user

Revision ID: add_pin_to_user
Revises: 
Create Date: 2025-05-27 01:05:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_pin_to_user'
down_revision = None  # Set this to the previous migration ID if there is one
branch_labels = None
depends_on = None


def upgrade():
    # Add PIN and PIN set timestamp columns to the users table
    op.add_column('users', sa.Column('pin', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('pin_set_at', sa.DateTime(), nullable=True))


def downgrade():
    # Remove the columns if needed
    op.drop_column('users', 'pin_set_at')
    op.drop_column('users', 'pin')
