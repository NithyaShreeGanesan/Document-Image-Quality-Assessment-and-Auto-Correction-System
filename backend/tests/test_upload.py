import io
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import Document
from app.database import get_db


@pytest.fixture
def client():
    return TestClient(app)


def _make_dummy_image_bytes(text="DocuQuality Sample Upload Document") -> bytes:
    img = np.full((600, 800, 3), 245, dtype=np.uint8)
    cv2.putText(img, text, (60, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (30, 30, 30), 2)
    cv2.line(img, (60, 130), (740, 130), (50, 50, 50), 2)
    success, encoded = cv2.imencode(".png", img)
    assert success
    return encoded.tobytes()


def test_openapi_swagger_file_picker_schema(client):
    """
    Verifies that the OpenAPI schema for /upload defines files as an array of binary items
    with format='binary' so Swagger UI displays a file picker instead of array<string>.
    """
    schema = app.openapi()
    upload_schema = schema["components"]["schemas"]["Body_upload_documents_api_documents_upload_post"]
    files_prop = upload_schema["properties"]["files"]
    assert files_prop["type"] == "array"
    assert files_prop["items"]["type"] == "string"
    assert files_prop["items"].get("format") == "binary"


def test_upload_single_document(client):
    """Tests uploading a single document image via multipart form data."""
    img_bytes = _make_dummy_image_bytes("Single Document Test")
    files = [("files", ("test_invoice.png", io.BytesIO(img_bytes), "image/png"))]
    data = {"preset": "auto"}

    response = client.post("/api/documents/upload", files=files, data=data)
    assert response.status_code == 200, response.text

    payload = response.json()
    assert "batch_id" in payload
    assert "document_ids" in payload
    assert payload["count"] == 1
    assert len(payload["document_ids"]) == 1

    doc_id = payload["document_ids"][0]
    # Check that document detail can be retrieved
    doc_res = client.get(f"/api/documents/{doc_id}")
    assert doc_res.status_code == 200
    doc_detail = doc_res.json()
    assert doc_detail["id"] == doc_id
    assert doc_detail["status"] in ("pass", "needs_correction", "fail")


def test_upload_batch_documents(client):
    """Tests uploading multiple document images in a batch."""
    img1 = _make_dummy_image_bytes("Batch Document 1")
    img2 = _make_dummy_image_bytes("Batch Document 2")
    img3 = _make_dummy_image_bytes("Batch Document 3")

    files = [
        ("files", ("batch_doc1.png", io.BytesIO(img1), "image/png")),
        ("files", ("batch_doc2.png", io.BytesIO(img2), "image/png")),
        ("files", ("batch_doc3.png", io.BytesIO(img3), "image/png")),
    ]
    data = {"preset": "receipt"}

    response = client.post("/api/documents/upload", files=files, data=data)
    assert response.status_code == 200, response.text

    payload = response.json()
    assert payload["count"] == 3
    assert len(payload["document_ids"]) == 3
    assert payload["batch_id"] is not None

    # Check first document preset
    first_id = payload["document_ids"][0]
    detail_res = client.get(f"/api/documents/{first_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["preset"] == "receipt"


def test_upload_unsupported_extension_rejected(client):
    """Tests that files with unsupported extensions are rejected with HTTP 400."""
    fake_file = io.BytesIO(b"dummy executable content")
    files = [("files", ("malicious.exe", fake_file, "application/octet-stream"))]

    response = client.post("/api/documents/upload", files=files)
    assert response.status_code == 400
    assert "Unsupported format" in response.json()["detail"]


def test_upload_more_than_50_files_rejected(client):
    """Tests that upload batches exceeding 50 files are rejected with HTTP 400."""
    img = _make_dummy_image_bytes("dummy")
    files = [("files", (f"file_{i}.png", io.BytesIO(img), "image/png")) for i in range(51)]

    response = client.post("/api/documents/upload", files=files)
    assert response.status_code == 400
    assert "Maximum 50 files" in response.json()["detail"]
