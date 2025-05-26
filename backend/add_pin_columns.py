# add_pin_columns.py
from sqlalchemy import create_engine, text
import os

# Get the database URL from environment variable
DATABASE_URL = os.environ.get("DATABASE_URL")

# Fix the URL if it starts with postgres:// (Heroku issue)
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

def add_pin_columns():
    """Add pin and pin_set_at columns to the users table if they don't exist"""
    print(f"Connecting to database...")
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if the columns already exist
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('pin', 'pin_set_at')
        """))
        
        existing_columns = [row[0] for row in result]
        
        if 'pin' not in existing_columns:
            print("Adding 'pin' column to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN pin VARCHAR(255)"))
        else:
            print("'pin' column already exists.")
            
        if 'pin_set_at' not in existing_columns:
            print("Adding 'pin_set_at' column to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN pin_set_at TIMESTAMP"))
        else:
            print("'pin_set_at' column already exists.")
            
        conn.commit()
        print("Database update complete!")

if __name__ == "__main__":
    add_pin_columns()
