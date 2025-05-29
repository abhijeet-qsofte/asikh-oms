from sqlalchemy import create_engine, text
import os
import sys
sys.path.append("/app")

# Get DATABASE_URL from environment
DATABASE_URL = os.environ.get('DATABASE_URL')

# Fix for SQLAlchemy 1.4+ to handle 'postgres://' URLs
if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

print(f"Using database URL: {DATABASE_URL}")

# Create engine
engine = create_engine(DATABASE_URL)

try:
    # SQL commands to delete records
    with engine.connect() as connection:
        print("Deleting crate_reconciliations...")
        connection.execute(text("DELETE FROM crate_reconciliations"))
        
        print("Deleting reconciliation_logs...")
        connection.execute(text("DELETE FROM reconciliation_logs"))
        
        print("Deleting crates...")
        connection.execute(text("DELETE FROM crates"))
        
        print("Deleting batches...")
        connection.execute(text("DELETE FROM batches"))
        
        # Commit the transaction
        connection.commit()

    print("All batch and crate records have been deleted successfully!")
except Exception as e:
    print(f"Error executing deletion: {str(e)}")
    sys.exit(1)
