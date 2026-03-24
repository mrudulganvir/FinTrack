from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.db import Base, engine
from app.database import models

from app.routes import auth_route
from app.routes import transaction_route
from app.routes import budget_routes
from app.routes import meta_routes  

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FinTrack",
    description="A personal financial tracking application",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to your frontend origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_route.router)
app.include_router(transaction_route.router)
app.include_router(budget_routes.router)
app.include_router(meta_routes.router)  # FIX: now registered — /meta/categories is reachable


@app.get("/")
def root():
    return {"message": "FinTrack Backend Running"}