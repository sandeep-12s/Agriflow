"""
Database connection setup.

DATABASE_URL comes from .env — sqlite:///./agriflow.db for local dev,
swap to a postgresql:// URL for deployment with no code changes needed
elsewhere in the app.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import settings

# check_same_thread is only needed for SQLite; harmless to skip for Postgres
connect_args = (
    {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
)

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """All models inherit from this so SQLAlchemy knows about their tables."""
    pass


def get_db():
    """
    FastAPI dependency: opens one DB session per request and always
    closes it afterwards, even if the request raises an error.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """
    Create any tables that don't exist yet, based on the models.

    This is the MVP-speed stand-in for a migration tool: for a hackathon
    timeline, create_all() is faster and has fewer moving parts than
    Alembic, and it's safe to call on every startup — it never touches
    tables that already exist. If AgriFlow grows past the MVP and needs
    versioned, reversible schema changes, that's the point to introduce
    Alembic; nothing else in the app would need to change.
    """
    from app.db import models  # noqa: F401 — registers all tables on Base
    Base.metadata.create_all(bind=engine)
