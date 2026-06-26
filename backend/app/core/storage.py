"""storage.py — file storage abstraction.

Local-disk implementation today; the interface (save / path / delete by an
opaque key) is deliberately S3/MinIO-shaped, so the backend can swap to object
storage later without touching the document service, schemas, API or frontend.

Keys are relative POSIX paths under ``settings.UPLOAD_DIR``; the base dir is read
lazily per call so tests can repoint it to a throwaway directory.
"""

import uuid
from pathlib import Path

from app.config import settings


def make_key(project_id: int, filename: str) -> str:
    """An opaque, collision-proof storage key that preserves the extension."""
    suffix = Path(filename).suffix.lower()
    return f"projects/{project_id}/{uuid.uuid4().hex}{suffix}"


class LocalStorage:
    """Stores blobs on the local filesystem under ``settings.UPLOAD_DIR``."""

    @property
    def _base(self) -> Path:
        return Path(settings.UPLOAD_DIR)

    def path_for(self, key: str) -> Path:
        return self._base / key

    def save(self, key: str, data: bytes) -> None:
        dest = self.path_for(key)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)

    def delete(self, key: str) -> None:
        dest = self.path_for(key)
        if dest.exists():
            dest.unlink()


storage = LocalStorage()
