"""document_repo.py — DB queries for project documents."""

from app.models.master import Document
from app.repositories.base_repo import BaseRepository


class DocumentRepository(BaseRepository[Document]):
    model = Document
