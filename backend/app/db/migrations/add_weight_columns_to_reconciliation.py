"""
Migration script to add original_weight and weight_differential columns to crate_reconciliations table
"""
import logging
from sqlalchemy import text
from app.core.database import engine

logger = logging.getLogger(__name__)

def add_weight_columns():
    """Add original_weight and weight_differential columns to crate_reconciliations table"""
    
    try:
        # Check if the columns already exist
        with engine.connect() as connection:
            # Check if the table exists
            table_exists_query = text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'crate_reconciliations'
                );
            """)
            table_exists = connection.execute(table_exists_query).scalar()
            
            if not table_exists:
                logger.warning("crate_reconciliations table does not exist, skipping migration")
                return
            
            # Check if original_weight column exists
            original_weight_exists_query = text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'crate_reconciliations' AND column_name = 'original_weight'
                );
            """)
            original_weight_exists = connection.execute(original_weight_exists_query).scalar()
            
            # Check if weight_differential column exists
            weight_differential_exists_query = text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'crate_reconciliations' AND column_name = 'weight_differential'
                );
            """)
            weight_differential_exists = connection.execute(weight_differential_exists_query).scalar()
            
            # Add columns if they don't exist
            if not original_weight_exists:
                logger.info("Adding original_weight column to crate_reconciliations table")
                add_original_weight_query = text("""
                    ALTER TABLE crate_reconciliations 
                    ADD COLUMN original_weight FLOAT;
                """)
                connection.execute(add_original_weight_query)
                connection.commit()
                logger.info("Added original_weight column successfully")
            else:
                logger.info("original_weight column already exists, skipping")
            
            if not weight_differential_exists:
                logger.info("Adding weight_differential column to crate_reconciliations table")
                add_weight_differential_query = text("""
                    ALTER TABLE crate_reconciliations 
                    ADD COLUMN weight_differential FLOAT;
                """)
                connection.execute(add_weight_differential_query)
                connection.commit()
                logger.info("Added weight_differential column successfully")
            else:
                logger.info("weight_differential column already exists, skipping")
            
        logger.info("Migration completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"Error in migration: {str(e)}")
        return False

if __name__ == "__main__":
    add_weight_columns()
