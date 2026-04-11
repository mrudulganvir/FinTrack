from app.services.categorization_service import _MODEL_PATH
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.db import Base, engine
from app.database import models

from app.routes import auth_route, transaction_route, budget_routes, report_routes, loan_routes, predictive_budget_routes, alert_routes, chat_routes

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="FinTrack", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://pfma-8c7b8.web.app", "https://pfma-8c7b8.firebaseapp.com", "http://localhost:3000", "http://localhost:5000", "http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_route.router)
app.include_router(transaction_route.router)
app.include_router(budget_routes.router)
app.include_router(report_routes.router)
app.include_router(loan_routes.router)
app.include_router(predictive_budget_routes.router)
app.include_router(alert_routes.router)
app.include_router(chat_routes.router)


@app.get("/")
def root():
    return {"message": "FinTrack v2.0 Running"}