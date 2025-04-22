# tests/api/test_crates.py
import uuid
from fastapi import status
from app.core.config import settings
from app.models.variety import Variety

def test_create_crate_success(client, db_session, harvester_user, harvester_headers):
    # 1) Prep a variety record
    variety = Variety(name="Jardalu", description="Jardalu Bhagalpur")
    db_session.add(variety)
    db_session.commit()

    # 2) Build payload
    qr_code = f"ASIKH-CRATE-{uuid.uuid4()}"
    payload = {
        "qr_code": qr_code,
        "weight": 12.34,
        "supervisor_id": str(harvester_user.id),
        "variety_id": str(variety.id),
        "gps_location": {"lat": 10.0, "lng": 20.0},
        "notes": "Test creation",
        "quality_grade": "A"
    }

    # 3) Call endpoint
    resp = client.post(
        f"{settings.API_V1_STR}/crates",
        json=payload,
        headers=harvester_headers
    )
    assert resp.status_code == status.HTTP_201_CREATED

    data = resp.json()
    assert data["qr_code"] == qr_code
    assert data["weight"] == payload["weight"]
    assert data["supervisor_id"] == payload["supervisor_id"]
    assert data["variety_id"] == payload["variety_id"]
    assert data["notes"] == payload["notes"]
    assert data["quality_grade"] == payload["quality_grade"]
    assert "id" in data