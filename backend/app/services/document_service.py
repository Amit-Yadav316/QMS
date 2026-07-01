"""document_service.py — business logic for the project document store.

Validates the upload (extension + size), persists the blob through the storage
backend, and records a ``master.documents`` row. Reads are project-scoped;
delete is restricted to the uploader or a project manager.
"""

from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import (
    FileTooLargeError,
    NotFoundError,
    PermissionDeniedError,
    UnsupportedFileTypeError,
)
from app.core.project_access import can_manage_project
from app.core.storage import make_key, storage
from app.models.auth import User
from app.models.master import Document, Project
from app.repositories.document_repo import DocumentRepository
from app.schemas.documents import DocumentResponse, DocumentReview

ALLOWED_EXTENSIONS = {
    ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp",
    ".csv", ".xls", ".xlsx", ".doc", ".docx", ".txt",
}


class DocumentService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = DocumentRepository(session)

    async def list_for_project(self, project: Project) -> list[DocumentResponse]:
        rows = await self.repo.list_by(
            Document.project_id == project.project_id,
            order_by=Document.uploaded_at.desc(),
        )
        names = await self._uploader_names(rows)
        return [self._to_response(d, names) for d in rows]

    async def upload(
        self,
        project: Project,
        uploader: User,
        *,
        filename: str,
        content: bytes,
        content_type: str | None,
        document_type: str | None = None,
        title: str | None = None,
    ) -> DocumentResponse:
        ext = Path(filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise UnsupportedFileTypeError(ext or filename)
        if len(content) > settings.MAX_UPLOAD_BYTES:
            raise FileTooLargeError(settings.MAX_UPLOAD_BYTES)

        key = make_key(project.project_id, filename)
        storage.save(key, content)

        doc = await self.repo.add(
            Document(
                project_id=project.project_id,
                document_type=document_type,
                title=title,
                original_filename=filename,
                stored_key=key,
                content_type=content_type,
                size_bytes=len(content),
                uploaded_by=uploader.user_id,
            )
        )
        return self._to_response(doc, {uploader.user_id: uploader.full_name})

    async def review(
        self, project: Project, document_id: int, data: DocumentReview, user: User
    ) -> DocumentResponse:
        """A QE or PM approves / rejects an uploaded document."""
        doc = await self.get_for_download(project, document_id)
        doc.approval_status = data.approval_status.value
        doc.rejection_reason = (
            data.rejection_reason
            if data.approval_status.value == "REJECTED"
            else None
        )
        doc.reviewed_by = user.user_id
        doc.reviewed_at = datetime.now(UTC)
        await self.session.flush()
        return self._to_response(doc, await self._uploader_names([doc]))

    async def get_for_download(self, project: Project, document_id: int) -> Document:
        doc = await self.repo.get_by(
            Document.document_id == document_id,
            Document.project_id == project.project_id,
        )
        if not doc:
            raise NotFoundError("Document")
        return doc

    async def delete(self, project: Project, user: User, document_id: int) -> None:
        doc = await self.get_for_download(project, document_id)
        is_owner = doc.uploaded_by == user.user_id
        if not is_owner and not await can_manage_project(self.session, user, project):
            raise PermissionDeniedError(
                "Only the uploader or a project manager can delete this document"
            )
        storage.delete(doc.stored_key)
        await self.session.delete(doc)
        await self.session.flush()

    async def _uploader_names(self, docs: list[Document]) -> dict[int, str]:
        ids = {d.uploaded_by for d in docs if d.uploaded_by is not None}
        if not ids:
            return {}
        rows = (
            await self.session.execute(
                select(User.user_id, User.full_name).where(User.user_id.in_(ids))
            )
        ).all()
        return {uid: name for uid, name in rows}

    @staticmethod
    def _to_response(doc: Document, names: dict[int, str]) -> DocumentResponse:
        return DocumentResponse(
            document_id=doc.document_id,
            project_id=doc.project_id,
            document_type=doc.document_type,
            title=doc.title,
            original_filename=doc.original_filename,
            content_type=doc.content_type,
            size_bytes=doc.size_bytes,
            uploaded_by=doc.uploaded_by,
            uploaded_by_name=names.get(doc.uploaded_by) if doc.uploaded_by else None,
            approval_status=doc.approval_status,
            rejection_reason=doc.rejection_reason,
            reviewed_by=doc.reviewed_by,
            reviewed_at=doc.reviewed_at,
            uploaded_at=doc.uploaded_at,
        )
