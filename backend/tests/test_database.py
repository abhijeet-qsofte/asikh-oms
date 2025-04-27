import pytest
from fastapi.testclient import TestClient
import os
from unittest.mock import patch, MagicMock

# Import the FastAPI application
from main import app
from app.core.database import check_database_connection

# Create test client
client = TestClient(app)

# Fixtures
@pytest.fixture
def mock_db_connection_success():
    with patch('app.core.database.check_database_connection', return_value=True):
        yield

@pytest.fixture
def mock_db_connection_failure():
    with patch('app.core.database.check_database_connection', return_value=False):
        yield

# Test the root endpoint
def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Asikh OMS API is running", "status": "healthy"}

# Test health check with successful database connection
def test_health_check_success(mock_db_connection_success):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "components": {
            "api": "healthy",
            "database": "healthy"
        },
        "version": "1.0.0"
    }

# Test health check with failed database connection
def test_health_check_failure(mock_db_connection_failure):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "components": {
            "api": "healthy",
            "database": "unhealthy"
        },
        "version": "1.0.0"
    }

# Test middleware - process time header
def test_process_time_middleware():
    response = client.get("/")
    assert "X-Process-Time" in response.headers
    # Verify the process time is a float with 4 decimal places
    assert len(response.headers["X-Process-Time"].split(".")[1]) == 4

# Test CORS middleware
def test_cors_headers():
    # Options request to check CORS headers
    response = client.options("/", headers={"Origin": "http://localhost", "Access-Control-Request-Method": "GET"})
    assert response.status_code == 200
    assert "Access-Control-Allow-Origin" in response.headers
    assert "Access-Control-Allow-Methods" in response.headers

# Test error handling
def test_global_exception_handler():
    # Create a route that will raise an exception
    @app.get("/test-error")
    async def test_error():
        raise ValueError("Test error")
    
    response = client.get("/test-error")
    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error"}

# Test lifespan events
@pytest.mark.asyncio
async def test_lifespan_events():
    from main import lifespan
    
    # Mock the logger
    with patch('main.logger') as mock_logger:
        # Test startup with successful DB connection
        with patch('main.check_database_connection', return_value=True):
            async with lifespan(app):
                # Check that startup logs were called
                mock_logger.info.assert_any_call("Starting Asikh OMS API")
                mock_logger.info.assert_any_call("Database connection successful")
            
            # Check that shutdown logs were called
            mock_logger.info.assert_any_call("Shutting down Asikh OMS API")
        
        # Reset mock
        mock_logger.reset_mock()
        
        # Test startup with failed DB connection
        with patch('main.check_database_connection', return_value=False):
            async with lifespan(app):
                # Check that startup logs were called
                mock_logger.info.assert_any_call("Starting Asikh OMS API")
                mock_logger.error.assert_any_call("Failed to connect to database, check connection settings")
            
            # Check that shutdown logs were called
            mock_logger.info.assert_any_call("Shutting down Asikh OMS API")

# Test commented routers (we can't actually test them since they're commented out in the code)
def test_router_path_configuration():
    from app.core.config import settings
    
    # Test that API_V1_STR is defined
    assert hasattr(settings, 'API_V1_STR')
    # Additional tests would check that routers are properly configured when uncommented

if __name__ == "__main__":
    pytest.main(["-v"])