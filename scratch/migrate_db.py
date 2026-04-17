import sys
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Add project root to path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def migrate():
    if not DATABASE_URL:
        print("DATABASE_URL not found in .env")
        return

    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        print("Updating database schema...")
        
        # 1. Add Investment table (if not exists)
        # Note: Base.metadata.create_all(engine) takes care of this if called in main.py, 
        # but let's be explicit for the biometric_type column on existing users table.
        
        try:
            print("Adding 'biometric_type' column to 'users' table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_type VARCHAR(20);"))
            conn.commit()
            print("Successfully added 'biometric_type' column.")
        except Exception as e:
            print(f"Error adding column: {e}")

        # 2. Ensure investments table exists (since it was just added to models)
        try:
            from app.database.models import Base
            Base.metadata.create_all(bind=engine)
            print("All models synced (Investment, etc.).")
        except Exception as e:
            print(f"Error syncing models: {e}")

if __name__ == "__main__":
    migrate()
