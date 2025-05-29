from sqlalchemy import create_engine, text
import os

# Get DATABASE_URL from environment
DATABASE_URL = os.environ.get('DATABASE_URL')

# Fix for SQLAlchemy 1.4+ to handle 'postgres://' URLs
if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

# Create engine
engine = create_engine(DATABASE_URL)

# SQL commands to delete records
sql_commands = """
-- First delete crate_reconciliations (dependent on crates)
DELETE FROM crate_reconciliations;

-- Then delete reconciliation_logs (dependent on batches)
DELETE FROM reconciliation_logs;

-- Then delete crates (dependent on batches)
DELETE FROM crates;

-- Finally delete batches
DELETE FROM batches;
"""

# Execute the SQL commands
with engine.connect() as connection:
    # Split the SQL commands by semicolon and execute each one
    for command in sql_commands.split(';'):
        if command.strip():
            print(f"Executing: {command.strip()}")
            connection.execute(text(command))
    
    # Commit the transaction
    connection.commit()

print("All batch and crate records have been deleted successfully!")
