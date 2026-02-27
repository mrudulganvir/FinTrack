<<<<<<< HEAD
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    connect_args={"ssl": {"ssl_disabled": False}}
)

SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()
=======
from app.core.config import settings
import mysql.connector
>>>>>>> a99515cde99f4ff2f9101f04ebce5e18dea9a2e3

def get_db_connection():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()