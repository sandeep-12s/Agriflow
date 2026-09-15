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
    run_migrations()


def run_migrations() -> None:
    """
    Lightweight, additive-only schema migrations.

    SQLAlchemy's create_all() will create new tables but will NOT add
    new columns to already-existing tables. This function handles that
    gap by issuing safe ALTER TABLE … ADD COLUMN IF NOT EXISTS statements
    for any columns that were added to models after initial deployment.

    Safe to run every startup — IF NOT EXISTS means it's a no-op when
    the column already exists.
    """
    import logging
    from sqlalchemy import text

    log = logging.getLogger(__name__)

    # Map of (table, column, column_definition) to add if missing
    migrations = [
        ("users", "sms_weather_alerts", "BOOLEAN DEFAULT TRUE"),
        ("sms_logs", "id", None),  # whole table — handled by create_all above
    ]

    with engine.connect() as conn:
        is_postgres = settings.DATABASE_URL.startswith("postgresql")
        for table, column, definition in migrations:
            if definition is None:
                continue  # whole-table creation handled by create_all
            try:
                if is_postgres:
                    conn.execute(
                        text(
                            f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS"
                            f" {column} {definition}"
                        )
                    )
                else:
                    # SQLite doesn't support IF NOT EXISTS on ALTER TABLE —
                    # check manually before adding
                    result = conn.execute(text(f"PRAGMA table_info({table})"))
                    existing = {row[1] for row in result}
                    if column not in existing:
                        conn.execute(
                            text(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
                        )
                conn.commit()
                log.info("Migration OK: %s.%s", table, column)
            except Exception as exc:
                log.warning("Migration skipped (%s.%s): %s", table, column, exc)

