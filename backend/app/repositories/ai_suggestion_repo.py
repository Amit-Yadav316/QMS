"""ai_suggestion_repo.py — DB access for Phase-9 AISuggestions and the NCR
embedding cache.

Both are 1:1 with an NCR. ``AISuggestionRepository`` stores the latest generated
suggestion (regenerating replaces the previous one); ``NCREmbeddingRepository``
caches a closed NCR's vector so the corpus isn't re-embedded on every request.
"""

from app.models.quality import AISuggestion, NCREmbedding
from app.repositories.base_repo import BaseRepository


class AISuggestionRepository(BaseRepository[AISuggestion]):
    model = AISuggestion

    async def get_for_ncr(self, ncr_id: int) -> AISuggestion | None:
        return await self.get_by(AISuggestion.ncr_id == ncr_id)


class NCREmbeddingRepository(BaseRepository[NCREmbedding]):
    model = NCREmbedding

    async def get_for_ncr(self, ncr_id: int) -> NCREmbedding | None:
        return await self.get_by(NCREmbedding.ncr_id == ncr_id)

    async def get_for_ncrs(self, ncr_ids: list[int]) -> dict[int, NCREmbedding]:
        if not ncr_ids:
            return {}
        rows = await self.list_by(NCREmbedding.ncr_id.in_(ncr_ids))
        return {r.ncr_id: r for r in rows}

    async def upsert(
        self, ncr_id: int, *, vector: list[float], source_text: str, model: str
    ) -> NCREmbedding:
        """Insert or refresh the cached embedding for one NCR."""
        existing = await self.get_for_ncr(ncr_id)
        if existing is not None:
            existing.vector = vector
            existing.source_text = source_text
            existing.model = model
            existing.dim = len(vector)
            await self.session.flush()
            return existing
        return await self.add(
            NCREmbedding(
                ncr_id=ncr_id,
                vector=vector,
                source_text=source_text,
                model=model,
                dim=len(vector),
            )
        )
