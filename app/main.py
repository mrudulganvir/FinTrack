from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .database.db import get_db_connection
from app.database.db import Base, engine
from app.database import models

from app.routes import auth_route
from app.routes import transaction_route
from app.routes import budget_routes

models.Base.metadata.create_all(bind=engine)
app = FastAPI(title="FinTrack", description="A financial tracking application", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_route.router)
app.include_router(transaction_route.router)
app.include_router(budget_routes.router)

@app.get("/")
def root():
    return {"message": "FINTRACK Backend Running"}