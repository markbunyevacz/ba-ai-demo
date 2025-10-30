"""Integration tests for upload endpoints."""
from __future__ import annotations

from io import BytesIO

from fastapi.testclient import TestClient


def test_upload_requires_file(client: TestClient) -> None:
    response = client.post('/api/upload')
    assert response.status_code == 422  # FastAPI validation error


def test_upload_document_rejects_invalid_file_type(client: TestClient) -> None:
    fake_file = BytesIO(b'invalid content')
    files = {'file': ('test.txt', fake_file, 'text/plain')}

    response = client.post('/api/upload/document', files=files)

    # Endpoint should reject unsupported mime type with HTTP 400
    assert response.status_code == 400
    payload = response.json()
    assert 'detail' in payload
