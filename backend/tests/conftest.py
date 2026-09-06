"""
Pytest Configuration and Fixtures for Polaris Backend Tests
"""
import asyncio
import uuid
from typing import AsyncGenerator
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from app.main import create_app
from app.db.models import Base, User, UserRole, UserStatus
from app.db.base import get_db
from app.core.security import hash_password

# Test database URL — SQLite in-memory for fast and isolated unit tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provides a transactional database session for testing."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Provides an HTTP test client connected to the FastAPI application."""
    from app.middleware.rate_limit import limiter
    limiter.enabled = False

    app = create_app()

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as c:
        yield c

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def seed_admin(db_session: AsyncSession) -> User:
    """Seeds an active admin user."""
    admin = User(
        id=uuid.uuid4(),
        employee_id="ADM-0001",
        email="admin@polaris-oil.internal",
        full_name="Chief Administrator",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        password_hash=hash_password("AdminSecurePass123!"),
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    return admin


@pytest_asyncio.fixture
async def seed_operator(db_session: AsyncSession) -> User:
    """Seeds an active operator user."""
    operator = User(
        id=uuid.uuid4(),
        employee_id="OIL-OP-4102",
        email="operator@polaris-oil.internal",
        full_name="Field Operator One",
        role=UserRole.OPERATOR,
        status=UserStatus.ACTIVE,
        password_hash=hash_password("OperatorPass123!"),
    )
    db_session.add(operator)
    await db_session.commit()
    await db_session.refresh(operator)
    return operator
