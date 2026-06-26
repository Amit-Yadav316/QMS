"""Integration tests for Phase 7 — the project document store:

  upload a file → it appears in the list → download returns the bytes →
  delete removes it. Plus validation (extension, size, bad category) and RBAC
  (only the uploader or a project manager may delete).
"""

import pytest

from app.config import settings
from tests.helpers import API, bearer
from tests.integration.test_phase1_master_flow import _contractor_on_project
from tests.integration.test_phase2_pour_flow import _project_with_qe


@pytest.fixture(autouse=True)
def _uploads_to_tmp(tmp_path, monkeypatch):
    """Point file storage at a throwaway dir so tests never write into the repo."""
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))


def _file(name="report.pdf", content=b"%PDF-1.4 demo", ctype="application/pdf"):
    return {"file": (name, content, ctype)}


class TestDocumentStore:
    async def test_upload_list_download_delete(self, client, db_session):
        _, contractor_token, project_id = await _contractor_on_project(client, db_session)

        up = await client.post(
            f"{API}/projects/{project_id}/documents",
            files=_file(),
            data={"document_type": "MIX_DESIGN", "title": "Approved mix"},
            headers=bearer(contractor_token),
        )
        assert up.status_code == 201, up.text
        doc = up.json()
        assert doc["original_filename"] == "report.pdf"
        assert doc["document_type"] == "MIX_DESIGN"
        assert doc["title"] == "Approved mix"
        assert doc["size_bytes"] == len(b"%PDF-1.4 demo")
        assert doc["uploaded_by_name"]

        listed = await client.get(
            f"{API}/projects/{project_id}/documents", headers=bearer(contractor_token)
        )
        assert [d["document_id"] for d in listed.json()] == [doc["document_id"]]

        dl = await client.get(
            f"{API}/projects/{project_id}/documents/{doc['document_id']}/download",
            headers=bearer(contractor_token),
        )
        assert dl.status_code == 200
        assert dl.content == b"%PDF-1.4 demo"

        rm = await client.delete(
            f"{API}/projects/{project_id}/documents/{doc['document_id']}",
            headers=bearer(contractor_token),
        )
        assert rm.status_code == 204
        after = await client.get(
            f"{API}/projects/{project_id}/documents", headers=bearer(contractor_token)
        )
        assert after.json() == []

    async def test_unsupported_extension_rejected(self, client, db_session):
        _, contractor_token, project_id = await _contractor_on_project(client, db_session)
        resp = await client.post(
            f"{API}/projects/{project_id}/documents",
            files=_file(name="evil.exe", content=b"MZ", ctype="application/octet-stream"),
            headers=bearer(contractor_token),
        )
        assert resp.status_code == 415, resp.text

    async def test_oversize_rejected(self, client, db_session, monkeypatch):
        _, contractor_token, project_id = await _contractor_on_project(client, db_session)
        monkeypatch.setattr(settings, "MAX_UPLOAD_BYTES", 10)
        resp = await client.post(
            f"{API}/projects/{project_id}/documents",
            files=_file(content=b"this is definitely more than ten bytes"),
            headers=bearer(contractor_token),
        )
        assert resp.status_code == 413, resp.text

    async def test_invalid_document_type_rejected(self, client, db_session):
        _, contractor_token, project_id = await _contractor_on_project(client, db_session)
        resp = await client.post(
            f"{API}/projects/{project_id}/documents",
            files=_file(),
            data={"document_type": "NONSENSE"},
            headers=bearer(contractor_token),
        )
        assert resp.status_code == 422, resp.text

    async def test_only_uploader_or_manager_can_delete(self, client, db_session):
        contractor_token, qe_token, project_id = await _project_with_qe(client, db_session)
        up = await client.post(
            f"{API}/projects/{project_id}/documents",
            files=_file(),
            headers=bearer(contractor_token),
        )
        doc_id = up.json()["document_id"]

        # The QE is a project member (can view + upload) but is neither the
        # uploader nor a project manager, so cannot delete someone else's file.
        forbidden = await client.delete(
            f"{API}/projects/{project_id}/documents/{doc_id}", headers=bearer(qe_token)
        )
        assert forbidden.status_code == 403, forbidden.text

        # The contractor admin (a project manager) can.
        ok = await client.delete(
            f"{API}/projects/{project_id}/documents/{doc_id}",
            headers=bearer(contractor_token),
        )
        assert ok.status_code == 204
