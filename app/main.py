from app.services.categorization_service import _MODEL_PATH
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from app.database.db import Base, engine
from app.database import models

# ── Run DB migrations BEFORE create_all so existing tables get new columns ──
from app.database.migrations import run_migrations
run_migrations()

# create_all is still needed to create brand-new tables (e.g. linked_cards)
# models.Base.metadata.create_all(bind=engine)

from app.routes import (
    auth_route, transaction_route, budget_routes, report_routes,
    loan_routes, predictive_budget_routes, alert_routes, chat_routes,
    forget_password_routes, onboarding_routes, accounts_routes, investment_routes,
    advisor_routes
)

app = FastAPI(title="FinTrack", version="2.0.0")

from app.core.config import settings

# ── COOP header — required for Google Sign-In popup postMessage ───────────────
@app.middleware("http")
async def add_coop_header(request: Request, call_next):
    response: Response = await call_next(request)
    if request.url.path.startswith("/auth"):
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
    return response

# ── CORS (Move after other middlewares so it runs FIRST on the request) ──────
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://localhost:5000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://one-stop-9956a.web.app",
    "https://fintrack-1-7p43.onrender.com"
]

# Add FRONTEND_URL and BACKEND_URL from settings if they are not already in ALLOWED_ORIGINS
for url in [settings.FRONTEND_URL, settings.BACKEND_URL]:
    if url:
        clean_url = url.rstrip("/")
        if clean_url not in ALLOWED_ORIGINS:
            ALLOWED_ORIGINS.append(clean_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


app.include_router(auth_route.router)
app.include_router(transaction_route.router)
app.include_router(budget_routes.router)
app.include_router(report_routes.router)
app.include_router(loan_routes.router)
app.include_router(predictive_budget_routes.router)
app.include_router(alert_routes.router)
app.include_router(chat_routes.router)
app.include_router(forget_password_routes.router)
app.include_router(onboarding_routes.router)
app.include_router(accounts_routes.router)
app.include_router(investment_routes.router)
app.include_router(advisor_routes.router)


@app.get("/")
def root():
    return {"message": "FinTrack v2.0 Running"}
