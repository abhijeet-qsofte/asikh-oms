# tests/api/test_users.py
import pytest
from fastapi import status
import uuid

from app.core.config import settings
from app.models.user import User
from app.core.security import get_password_hash, verify_password

class TestUsers:
    """
    Test cases for the users endpoints
    """
    
    def test_get_current_user(self, client, admin_headers, test_user):
        """
        Test getting current user information
        """
        response = client.get(
            f"{settings.API_V1_STR}/users/me",
            headers=admin_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == str(test_user.id)
        assert data["username"] == test_user.username
        assert data["email"] == test_user.email
        assert data["role"] == test_user.role
        assert data["full_name"] == test_user.full_name
        assert data["active"] == test_user.active
    
    def test_get_user_by_id(self, client, admin_headers, test_user):
        """
        Test getting a user by ID
        """
        response = client.get(
            f"{settings.API_V1_STR}/users/{test_user.id}",
            headers=admin_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == str(test_user.id)
        assert data["username"] == test_user.username
        assert data["email"] == test_user.email
        assert data["role"] == test_user.role
    
    def test_get_user_by_id_not_found(self, client, admin_headers):
        """
        Test getting a nonexistent user
        """
        response = client.get(
            f"{settings.API_V1_STR}/users/{uuid.uuid4()}",
            headers=admin_headers
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_get_users(self, client, admin_headers, test_user, test_supervisor):
        """
        Test getting all users with pagination
        """
        response = client.get(
            f"{settings.API_V1_STR}/users/",
            headers=admin_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "users" in data
        assert data["total"] >= 2  # At least test_user and test_supervisor
        
        # Verify both our test users are in the results
        user_ids = [user["id"] for user in data["users"]]
        assert str(test_user.id) in user_ids
        assert str(test_supervisor.id) in user_ids
    
    def test_get_users_with_pagination(self, client, admin_headers):
        """
        Test pagination for users list
        """
        # Test first page
        response = client.get(
            f"{settings.API_V1_STR}/users/?page=1&page_size=1",
            headers=admin_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 1
        assert len(data["users"]) <= 1
        
        # Test second page
        response = client.get(
            f"{settings.API_V1_STR}/users/?page=2&page_size=1",
            headers=admin_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        data2 = response.json()
        assert data2["page"] == 2
        
        # Make sure we got different users on each page
        if len(data["users"]) > 0 and len(data2["users"]) > 0:
            assert data["users"][0]["id"] != data2["users"][0]["id"]
    
    def test_create_user(self, client, admin_headers, db_session):
        """
        Test creating a new user
        """
        user_data = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "Password123",
            "role": "harvester",
            "full_name": "New Test User"
        }
        
        response = client.post(
            f"{settings.API_V1_STR}/users/",
            headers=admin_headers,
            json=user_data
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["username"] == user_data["username"]
        assert data["email"] == user_data["email"]
        assert data["role"] == user_data["role"]
        assert data["full_name"] == user_data["full_name"]
        assert data["active"] == True
        
        # Verify user was actually created in the database
        created_user = db_session.query(User).filter(User.username == user_data["username"]).first()
        assert created_user is not None
        assert created_user.email == user_data["email"]
        assert verify_password(user_data["password"], created_user.password)
    
    def test_create_user_existing_username(self, client, admin_headers, test_user):
        """
        Test creating a user with an existing username
        """
        user_data = {
            "username": test_user.username,  # Already exists
            "email": "different@example.com",
            "password": "Password123",
            "role": "harvester",
            "full_name": "New Test User"
        }
        
        response = client.post(
            f"{settings.API_V1_STR}/users/",
            headers=admin_headers,
            json=user_data
        )
        
        assert response.status_code == status.HTTP_409_CONFLICT
    
    def test_create_user_existing_email(self, client, admin_headers, test_user):
        """
        Test creating a user with an existing email
        """
        user_data = {
            "username": "different_username",
            "email": test_user.email,  # Already exists
            "password": "Password123",
            "role": "harvester",
            "full_name": "New Test User"
        }
        
        response = client.post(
            f"{settings.API_V1_STR}/users/",
            headers=admin_headers,
            json=user_data
        )
        
        assert response.status_code == status.HTTP_409_CONFLICT
    
    def test_create_user_invalid_role(self, client, admin_headers):
        """
        Test creating a user with an invalid role
        """
        user_data = {
            "username": "invalid_role_user",
            "email": "invalid_role@example.com",
            "password": "Password123",
            "role": "invalid_role",  # Not an allowed role
            "full_name": "Invalid Role User"
        }
        
        response = client.post(
            f"{settings.API_V1_STR}/users/",
            headers=admin_headers,
            json=user_data
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_update_user(self, client, admin_headers, test_harvester, db_session):
        """
        Test updating a user
        """
        update_data = {
            "full_name": "Updated Full Name",
            "email": "updated_email@example.com",
            "role": "supervisor"
        }
        
        response = client.put(
            f"{settings.API_V1_STR}/users/{test_harvester.id}",
            headers=admin_headers,
            json=update_data
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == str(test_harvester.id)
        assert data["full_name"] == update_data["full_name"]
        assert data["email"] == update_data["email"]
        assert data["role"] == update_data["role"]
        
        # Verify the user was actually updated in the database
        db_session.refresh(test_harvester)
        assert test_harvester.full_name == update_data["full_name"]
        assert test_harvester.email == update_data["email"]
        assert test_harvester.role == update_data["role"]
    
    def test_update_user_not_found(self, client, admin_headers):
        """
        Test updating a nonexistent user
        """
        update_data = {
            "full_name": "Updated Name",
            "email": "updated@example.com"
        }
        
        response = client.put(
            f"{settings.API_V1_STR}/users/{uuid.uuid4()}",
            headers=admin_headers,
            json=update_data
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_update_user_conflict_email(self, client, admin_headers, test_harvester, test_supervisor):
        """
        Test updating a user with an email that already exists
        """
        update_data = {
            "email": test_supervisor.email  # This email already belongs to test_supervisor
        }
        
        response = client.put(
            f"{settings.API_V1_STR}/users/{test_harvester.id}",
            headers=admin_headers,
            json=update_data
        )
        
        assert response.status_code == status.HTTP_409_CONFLICT
    
    def test_deactivate_user(self, client, admin_headers, test_harvester, db_session):
        """
        Test deactivating a user
        """
        response = client.patch(
            f"{settings.API_V1_STR}/users/{test_harvester.id}/deactivate",
            headers=admin_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == str(test_harvester.id)
        assert data["active"] == False
        
        # Verify the user was actually deactivated in the database
        db_session.refresh(test_harvester)
        assert test_harvester.active == False
    
    def test_activate_user(self, client, admin_headers, inactive_user, db_session):
        """
        Test activating a user
        """
        response = client.patch(
            f"{settings.API_V1_STR}/users/{inactive_user.id}/activate",
            headers=admin_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == str(inactive_user.id)
        assert data["active"] == True
        
        # Verify the user was actually activated in the database
        db_session.refresh(inactive_user)
        assert inactive_user.active == True
    
    def test_change_password(self, client, admin_headers, test_user, db_session):
        """
        Test changing a user's password
        """
        password_data = {
            "current_password": "password123",
            "new_password": "NewPassword456"
        }
        
        response = client.post(
            f"{settings.API_V1_STR}/users/password",
            headers=admin_headers,
            json=password_data
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify the password was actually changed in the database
        db_session.refresh(test_user)
        assert verify_password(password_data["new_password"], test_user.password)
    
    def test_change_password_incorrect_current(self, client, admin_headers):
        """
        Test changing password with incorrect current password
        """
        password_data = {
            "current_password": "wrong_password",
            "new_password": "NewPassword456"
        }
        
        response = client.post(
            f"{settings.API_V1_STR}/users/password",
            headers=admin_headers,
            json=password_data
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_change_password_weak_new(self, client, admin_headers):
        """
        Test changing to a weak password
        """
        password_data = {
            "current_password": "password123",
            "new_password": "weak"  # Too short, no uppercase, no digits
        }
        
        response = client.post(
            f"{settings.API_V1_STR}/users/password",
            headers=admin_headers,
            json=password_data
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_unauthorized_access(self, client, harvester_headers):
        """
        Test accessing admin-only endpoints with harvester role
        """
        # Try to get all users (admin only operation)
        response = client.get(
            f"{settings.API_V1_STR}/users/",
            headers=harvester_headers
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN