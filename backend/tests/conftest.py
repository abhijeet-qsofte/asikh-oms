# tests/conftest.py
import sys, os

from dotenv import load_dotenv

# force-load .env.test before any app.Settings is imported
load_dotenv(os.path.join(os.getcwd(), ".env.test"), override=True)

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from main import app
from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.core.security import get_password_hash, create_access_token



# Create/drop tables once per function
@pytest.fixture(scope="function", autouse=True)
def prepare_db():
    print("⏺ Using test database:", engine.url)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    session = SessionLocal()
    yield session
    session.rollback()
    session.close()

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def admin_user(db_session):
    u = User(
        username="admin",
        email="admin@example.com",
        password=get_password_hash("adminpass"),
        role="admin",
        full_name="Admin User",
        active=True,
    )
    db_session.add(u); db_session.commit()
    return u

@pytest.fixture
def admin_headers(test_user):
    token = create_access_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def harvester_user(db_session):
    u = User(
        username="harvester",
        email="harv@example.com",
        password=get_password_hash("harvpass"),
        role="harvester",
        full_name="Harvester",
        active=True,
    )
    db_session.add(u); db_session.commit()
    return u

@pytest.fixture
def harvester_headers(harvester_user):
    token = create_access_token(harvester_user.id)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def test_user(db_session):
    # used for /users/me and GET by id
    u = User(
        username="testuser",
        email="testuser@example.com",
        password=get_password_hash("password123"),
        role="admin",
        full_name="Test User",
        active=True,
    )
    db_session.add(u); db_session.commit()
    return u

@pytest.fixture
def test_supervisor(db_session):
    u = User(
        username="supervisor",
        email="supervisor@example.com",
        password=get_password_hash("password"),
        role="supervisor",
        full_name="Supervisor",
        active=True,
    )
    db_session.add(u); db_session.commit()
    return u

@pytest.fixture
def test_harvester(harvester_user):
    return harvester_user

@pytest.fixture
def inactive_user(db_session):
    u = User(
        username="inactiveuser",
        email="inactive@example.com",
        password=get_password_hash("password123"),
        role="admin",
        full_name="Inactive User",
        active=False,
    )
    db_session.add(u)
    db_session.commit()
    return u