"""
Shared test fixtures.

Every test gets a fresh, isolated in-memory SQLite database — never
the real agriflow.db. StaticPool is what makes that work: without it,
each new connection SQLAlchemy opens for `sqlite:///:memory:` would be
its own separate, empty database, so data created by one request
wouldn't be visible to the next.
"""
import itertools

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import Base, get_db
from app.db import models  # noqa: F401 — registers every table on Base

TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture()
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def seeded_client(client, db_session):
    """Use for any test that needs market/storage/processing/buyer demo data."""
    from app.db.seed import seed
    seed(db=db_session)
    return client


@pytest.fixture()
def register_farmer(client):
    """Returns a function so a test can register more than one farmer with
    different emails. Phone is also a unique field on the backend, so each
    call gets its own phone number by default unless explicitly overridden."""
    counter = itertools.count(1)

    def _register(email="farmer@example.com", **overrides):
        n = next(counter)
        payload = {
            "name": "Test Farmer",
            "phone": f"90000000{n:02d}",
            "email": email,
            "password": "testpass123",
            "location": "Bareilly, UP",
            "language": "en",
        }
        payload.update(overrides)
        otp_response = client.post("/auth/request-otp", json={"phone": payload["phone"]})
        assert otp_response.status_code == 200
        payload["otp"] = otp_response.json()["dev_code"]
        return client.post("/auth/register", json=payload)

    return _register


@pytest.fixture()
def auth_headers(register_farmer):
    response = register_farmer()
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
