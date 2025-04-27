import pytest
from fastapi import status
from app.core.config import settings

class TestAuth:
    def test_login_success(self, client, test_user):
        form = {
            "grant_type": "password",
            "username": test_user.username,
            "password": "password123",
        }
        resp = client.post(
            f"{settings.API_V1_STR}/auth/login",
            data=form,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["username"] == test_user.username
        assert data["role"] == test_user.role

    @pytest.mark.parametrize("username,password", [
        ("noone", "password123"),
        ("testuser", "wrongpass"),
    ])
    def test_login_invalid(self, client, username, password):
        form = {"grant_type": "password", "username": username, "password": password}
        resp = client.post(
            f"{settings.API_V1_STR}/auth/login",
            data=form,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_inactive(self, client, inactive_user):
        form = {
            "grant_type": "password",
            "username": inactive_user.username,
            "password": "password123",
        }
        resp = client.post(
            f"{settings.API_V1_STR}/auth/login",
            data=form,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_mobile_login_success(self, client, test_user):
        payload = {"username": test_user.username, "password": "password123"}
        resp = client.post(
            f"{settings.API_V1_STR}/auth/login/mobile",
            json=payload,
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "access_token" in resp.json()

    def test_mobile_login_invalid(self, client):
        payload = {"username": "noone", "password": "bad"}
        resp = client.post(
            f"{settings.API_V1_STR}/auth/login/mobile",
            json=payload,
        )
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_token(self, client, test_user):
        # log in first to get a refresh token
        form = {
            "grant_type": "password",
            "username": test_user.username,
            "password": "password123",
        }
        login_resp = client.post(
            f"{settings.API_V1_STR}/auth/login",
            data=form,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        rt = login_resp.json()["refresh_token"]

        resp = client.post(
            f"{settings.API_V1_STR}/auth/refresh",
            json={"refresh_token": rt},
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["access_token"] != login_resp.json()["access_token"]
        assert "refresh_token" in data

    def test_refresh_invalid(self, client):
        resp = client.post(
            f"{settings.API_V1_STR}/auth/refresh",
            json={"refresh_token": "bad.token"},
        )
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED