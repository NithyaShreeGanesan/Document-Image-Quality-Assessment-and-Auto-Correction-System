import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_register_and_login_flow(client):
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    password = "StrongPassword123!"
    full_name = "Alex Documenter"

    # 1. Register a new user
    reg_res = client.post(
        "/api/auth/register",
        json={
            "full_name": full_name,
            "email": unique_email,
            "password": password,
        },
    )
    assert reg_res.status_code == 201, reg_res.text
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == unique_email
    assert reg_data["user"]["full_name"] == full_name
    token = reg_data["access_token"]

    # 2. Duplicate registration should fail
    dup_res = client.post(
        "/api/auth/register",
        json={
            "full_name": full_name,
            "email": unique_email,
            "password": password,
        },
    )
    assert dup_res.status_code == 400

    # 3. Successful login
    login_res = client.post(
        "/api/auth/login",
        json={
            "email": unique_email,
            "password": password,
        },
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    assert login_data["user"]["email"] == unique_email

    # 4. Failed login with wrong password
    bad_login_res = client.post(
        "/api/auth/login",
        json={
            "email": unique_email,
            "password": "WrongPassword999!",
        },
    )
    assert bad_login_res.status_code == 401

    # 5. Protected route without token -> 401
    unauth_me = client.get("/api/auth/me")
    assert unauth_me.status_code == 401

    # 6. Protected route with token -> 200
    auth_me = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert auth_me.status_code == 200
    me_data = auth_me.json()
    assert me_data["email"] == unique_email
    assert me_data["full_name"] == full_name


def test_user_document_scoping(client):
    import io
    import cv2
    import numpy as np

    # User 1
    u1_email = f"u1_{uuid.uuid4().hex[:8]}@example.com"
    r1 = client.post("/api/auth/register", json={"full_name": "User One", "email": u1_email, "password": "Password123!"})
    assert r1.status_code == 201
    t1 = r1.json()["access_token"]

    # User 2
    u2_email = f"u2_{uuid.uuid4().hex[:8]}@example.com"
    r2 = client.post("/api/auth/register", json={"full_name": "User Two", "email": u2_email, "password": "Password123!"})
    assert r2.status_code == 201
    t2 = r2.json()["access_token"]

    # User 1 uploads a document
    img = np.full((300, 400, 3), 255, dtype=np.uint8)
    cv2.putText(img, "Doc User 1", (30, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    _, encoded = cv2.imencode(".png", img)
    files = [("files", ("u1_doc.png", io.BytesIO(encoded.tobytes()), "image/png"))]

    up_res = client.post(
        "/api/documents/upload",
        files=files,
        headers={"Authorization": f"Bearer {t1}"},
    )
    assert up_res.status_code == 200

    # User 1 lists documents -> sees their document
    u1_docs = client.get("/api/documents", headers={"Authorization": f"Bearer {t1}"}).json()
    assert u1_docs["total"] >= 1
    assert any(d["filename"] == "u1_doc.png" for d in u1_docs["items"])

    # User 2 lists documents -> cannot see User 1's document
    u2_docs = client.get("/api/documents", headers={"Authorization": f"Bearer {t2}"}).json()
    assert not any(d["filename"] == "u1_doc.png" for d in u2_docs["items"])
