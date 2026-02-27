from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth_route
from .database.db import get_db_connection
from app.database.db import engine
from app import models

models.Base.metadata.create_all(bind=engine)
app = FastAPI(title="FinTrack", description="A financial tracking application", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_route.router, prefix="/auth", tags=["Authentication"])

@app.get("/")
def root():
    return {"message": "FINTRACK Backend Running"}