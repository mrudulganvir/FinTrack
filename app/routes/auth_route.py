from fastapi import APIRouter, HTTPException, Depends
from app.database.db import get_db_connection
from app.database.schema import UserCreate, UserLogin
from app.auth.security import hash_password, verify_password, create_access_token
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from fastapi import status

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)):
    from app.config import settings
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
router = APIRouter()


@router.get("/profile")
def get_profile(current_user: str = Depends(get_current_user)):
    return {"message": f"Welcome {current_user}"}


@router.post("/register")
def register(user: UserCreate):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    try:
        hashed_password = hash_password(user.password)

        sql = "INSERT INTO users (email, password) VALUES (%s, %s)"
        cursor.execute(sql, (user.email, hashed_password))
        db.commit()

        return {"message": "User registered successfully"}

    except:
        raise HTTPException(status_code=400, detail="Email already exists")

    finally:
        cursor.close()
        db.close()

@router.post("/login")
def login(user: UserLogin):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    sql = "SELECT * FROM users WHERE email = %s"
    cursor.execute(sql, (user.email,))
    db_user = cursor.fetchone()

    cursor.close()
    db.close()

    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(
        data={"sub": db_user["email"]}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
    
