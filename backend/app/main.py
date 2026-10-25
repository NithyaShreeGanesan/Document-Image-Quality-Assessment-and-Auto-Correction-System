import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.alerts import router as alerts_router
from app.api.analytics import router as analytics_router
from app.api.documents import router as documents_router
from app.api.settings import router as settings_router
from app.database import Base, engine, run_sqlite_migrations

# Ensure database tables exist and apply any column migrations
Base.metadata.create_all(bind=engine)
run_sqlite_migrations(engine)

app = FastAPI(
    title="DocuQuality: Document Image Quality Assessment & Auto-Correction API",
    description="Automated scoring and targeted auto-correction engine for document scans and mobile captures.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS setup
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for convenient development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(documents_router)
app.include_router(analytics_router)
app.include_router(alerts_router)
app.include_router(settings_router)


@app.get("/")
def root():
    return {
        "app": "DocuQuality API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "docuquality-backend"}
