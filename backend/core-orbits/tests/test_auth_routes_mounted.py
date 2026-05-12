"""Test that auth routes are mounted at the expected /auth prefix."""
import sys
from pathlib import Path

# Ensure imports work when running outside Docker
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_auth_login_endpoint_exists():
    """POST /auth/login must be reachable (returns 422 for missing form data, not 404)."""
    response = client.post("/auth/login")
    # 422 = validation error because form data is missing
    # 404 = route not found (the bug we want to catch)
    assert response.status_code != 404, "Auth login endpoint not found at /auth/login"
