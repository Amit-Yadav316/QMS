"""
base_repo.py
------------
Generic async repository. Per-resource repos subclass this, set `model`,
and add any named queries they need. Mirrors the auth_repo conventions:
flush + refresh on write, never commit (get_db owns the transaction).
"""

from typing import Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from app.database.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    # Subclasses set this to their SQLAlchemy model class.
    model: type[ModelT]

    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(self, instance: ModelT) -> ModelT:
        """Persist a new instance within the request transaction."""
        self.session.add(instance)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    async def get_by(self, *conditions: ColumnElement[bool]) -> ModelT | None:
        result = await self.session.execute(
            select(self.model).where(*conditions)
        )
        return result.scalar_one_or_none()

    async def list_by(
        self,
        *conditions: ColumnElement[bool],
        order_by: ColumnElement | None = None,
    ) -> list[ModelT]:
        stmt = select(self.model)
        if conditions:
            stmt = stmt.where(*conditions)
        if order_by is not None:
            stmt = stmt.order_by(order_by)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
