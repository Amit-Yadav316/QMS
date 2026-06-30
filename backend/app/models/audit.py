"""
audit.py — Append-only logs (document ingestion + RAG embeddings)
Schema: audit

Nothing in this schema is ever updated or deleted.
"""

import enum
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class DocumentType(str, enum.Enum):
    MIX_DESIGN = "MIX_DESIGN"
    RMC_DETAIL = "RMC_DETAIL"
    POUR_RECORD = "POUR_RECORD"
    GRADE_DETAIL = "GRADE_DETAIL"
    CUBE_TEST_REGISTER = "CUBE_TEST_REGISTER"


class IngestionLog(Base):
    """
    One record per document upload.
    error_detail_json has row-level errors so you can debug
    exactly which rows failed and why.
    """
    __tablename__ = "ingestion_logs"
    __table_args__ = {"schema": "audit"}

    log_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    uploaded_by: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("auth.users.user_id"), nullable=True
    )
    filename: Mapped[str] = mapped_column(String(300), nullable=False)
    document_type: Mapped[DocumentType | None] = mapped_column(
        SAEnum(DocumentType, schema="audit"), nullable=True
    )
    rows_processed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rows_failed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_detail_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Embedding(Base):
    """
    Vector embeddings for RAG retrieval (Phase 6).
    Each row is a text chunk from a past failure with its vector.

    Requires pgvector extension — added via Alembic migration in Phase 6:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    The embedding column itself is added in that same migration.
    """
    __tablename__ = "embeddings"
    __table_args__ = {"schema": "audit"}

    embedding_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    source_table: Mapped[str] = mapped_column(String(100), nullable=False)
    source_id: Mapped[str] = mapped_column(String(50), nullable=False)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )