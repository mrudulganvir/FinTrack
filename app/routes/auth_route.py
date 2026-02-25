from fastapi import APIRouter, HTTPException
from app.database.db import get_db_connection
from app.database.schema import UserCreate, UserLogin

router = APIRouter()

@router.post("/register")
def register(user: UserCreate):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    try:
        sql = "INSERT INTO users (email, password) VALUES (%s, %s)"
        cursor.execute(sql, (user.email, user.password))
        db.commit()
        return {"message": "Registered successfully"}
    except:
        raise HTTPException(status_code=400, detail="Email already exists")
    finally:
        cursor.close()
        db.close()


@router.post("/login")
def login(user: UserLogin):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    sql = "SELECT * FROM users WHERE email = %s AND password = %s"
    cursor.execute(sql, (user.email, user.password))
    result = cursor.fetchone()

    cursor.close()
    db.close()

    if result:
        return {"message": "Login successful"}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")