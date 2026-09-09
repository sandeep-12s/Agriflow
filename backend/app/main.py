"""
AgriFlow API — entrypoint.

Wires together CORS, table creation on startup, and the route modules
(auth, farmers, ...) that get added stage by stage.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.database import init_db
from app.routers import (
    auth, farmers, dashboard, produce, markets, recommendations,
    buyers, transactions, storage, processing, assistant, analytics, weather,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs once when the server starts up — creates any tables that
    # don't exist yet. Safe to run every time; see init_db()'s docstring
    # for why this replaces a full migration tool at MVP stage.
    init_db()
    yield


app = FastAPI(
    title="AgriFlow API",
    description="Agricultural produce management and decision-support platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(farmers.router)
app.include_router(dashboard.router)
app.include_router(produce.router)
app.include_router(markets.router)
app.include_router(recommendations.router)
app.include_router(buyers.router)
app.include_router(transactions.router)
app.include_router(storage.router)
app.include_router(processing.router)
app.include_router(assistant.router)
app.include_router(analytics.router)
app.include_router(weather.router)


@app.get("/")
def root():
    return {"message": "AgriFlow API is running", "status": "ok"}


@app.get("/health")
def health_check():
    """Used by the frontend on load to confirm the backend is reachable."""
    return {
        "status": "healthy",
        "service": "agriflow-backend",
        "version": "0.1.0",
        "env": settings.ENV,
    }
