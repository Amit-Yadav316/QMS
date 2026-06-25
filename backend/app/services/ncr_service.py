"""ncr_service.py — NCR lifecycle: review, root cause, corrective actions, penalties.

Phase 5 builds on the auto-NCR raised by cube_service when a strength test fails.
An NCR moves through a small state machine::

    OPEN ──▶ UNDER_REVIEW ──▶ CLOSED
              ▲     │            │
              └─────┴────────────┘  (reopen)

Closing requires a recorded root cause and every corrective action completed.
While an NCR is CLOSED its corrective actions and penalties are frozen — reopen
it to change them. NCRs are project-scoped through their pour (NCR → Pour →
project_id); responses carry denormalised context so the dashboard renders
without extra lookups.
"""

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NCRStateError, NotFoundError
from app.models.auth import User
from app.models.master import Component, Floor, Grade, Project, Tower
from app.models.quality import (
    NCR,
    ActionStatus,
    CorrectiveAction,
    CubeTest,
    NCRStatus,
    Penalty,
)
from app.models.transaction import CubeSample, Pour
from app.repositories.cube_repo import (
    CorrectiveActionRepository,
    NCRRepository,
    PenaltyRepository,
)
from app.schemas.quality import (
    CorrectiveActionCreate,
    CorrectiveActionResponse,
    CorrectiveActionUpdate,
    NCRDetailResponse,
    NCRResponse,
    NCRUpdate,
    PenaltyCreate,
    PenaltyResponse,
)

# Allowed NCR status transitions. Closing is gated further (root cause + actions).
_ALLOWED_TRANSITIONS: dict[NCRStatus, set[NCRStatus]] = {
    NCRStatus.OPEN: {NCRStatus.UNDER_REVIEW},
    NCRStatus.UNDER_REVIEW: {NCRStatus.OPEN, NCRStatus.CLOSED},
    NCRStatus.CLOSED: {NCRStatus.UNDER_REVIEW},
}


class NCRService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.ncrs = NCRRepository(session)
        self.actions = CorrectiveActionRepository(session)
        self.penalties = PenaltyRepository(session)

    # ── Reads ──────────────────────────────────────────────────────────────────

    async def list_ncrs(self, project: Project) -> list[NCRResponse]:
        ncrs = await self.ncrs.list_for_project(project.project_id)
        ids = [n.ncr_id for n in ncrs]
        actions = await self.actions.list_for_ncrs(ids)
        penalties = await self.penalties.list_for_ncrs(ids)
        return [
            await self._summary(
                n,
                actions=[a for a in actions if a.ncr_id == n.ncr_id],
                penalties=[p for p in penalties if p.ncr_id == n.ncr_id],
            )
            for n in ncrs
        ]

    async def get_ncr(self, project: Project, ncr_id: int) -> NCRDetailResponse:
        ncr = await self._require(project, ncr_id)
        return await self._detail(ncr)

    # ── NCR lifecycle ───────────────────────────────────────────────────────────

    async def update_ncr(
        self, project: Project, ncr_id: int, data: NCRUpdate, user: User
    ) -> NCRDetailResponse:
        ncr = await self._require(project, ncr_id)

        if data.root_cause is not None:
            ncr.root_cause = data.root_cause.strip() or None

        if data.status is not None and data.status != ncr.status:
            await self._transition(ncr, data.status)

        await self.session.flush()
        return await self._detail(ncr)

    async def _transition(self, ncr: NCR, target: NCRStatus) -> None:
        if target not in _ALLOWED_TRANSITIONS.get(ncr.status, set()):
            raise NCRStateError(
                f"Cannot move an NCR from {ncr.status.value} to {target.value}"
            )
        if target == NCRStatus.CLOSED:
            if not ncr.root_cause:
                raise NCRStateError("Record a root cause before closing this NCR")
            actions = await self.actions.list_for_ncr(ncr.ncr_id)
            if any(a.status != ActionStatus.COMPLETED for a in actions):
                raise NCRStateError(
                    "All corrective actions must be completed before closing this NCR"
                )
            ncr.closed_at = datetime.now(UTC)
        else:
            # Reopening (or any non-close move) clears the closed timestamp.
            ncr.closed_at = None
        ncr.status = target

    # ── Corrective actions ───────────────────────────────────────────────────────

    async def add_corrective_action(
        self, project: Project, ncr_id: int, data: CorrectiveActionCreate, user: User
    ) -> CorrectiveActionResponse:
        ncr = await self._require(project, ncr_id)
        self._ensure_mutable(ncr)
        await self._validate_user(data.assigned_to)
        action = await self.actions.add(
            CorrectiveAction(
                ncr_id=ncr.ncr_id,
                action_description=data.action_description,
                assigned_to=data.assigned_to,
                due_date=data.due_date,
            )
        )
        return await self._action_response(action)

    async def update_corrective_action(
        self,
        project: Project,
        ncr_id: int,
        action_id: int,
        data: CorrectiveActionUpdate,
        user: User,
    ) -> CorrectiveActionResponse:
        ncr = await self._require(project, ncr_id)
        self._ensure_mutable(ncr)
        action = await self.actions.get_in_ncr(action_id, ncr.ncr_id)
        if not action:
            raise NotFoundError("Corrective action")

        if data.action_description is not None:
            action.action_description = data.action_description
        if data.assigned_to is not None:
            await self._validate_user(data.assigned_to)
            action.assigned_to = data.assigned_to
        if data.due_date is not None:
            action.due_date = data.due_date
        if data.status is not None:
            action.status = data.status

        await self.session.flush()
        return await self._action_response(action)

    # ── Penalties ────────────────────────────────────────────────────────────────

    async def add_penalty(
        self, project: Project, ncr_id: int, data: PenaltyCreate, user: User
    ) -> PenaltyResponse:
        ncr = await self._require(project, ncr_id)
        self._ensure_mutable(ncr)
        penalty = await self.penalties.add(
            Penalty(
                ncr_id=ncr.ncr_id,
                penalty_type=data.penalty_type,
                amount=data.amount,
                description=data.description,
                applied_by=user.user_id,
            )
        )
        return await self._penalty_response(penalty)

    # ── Internals ────────────────────────────────────────────────────────────────

    async def _require(self, project: Project, ncr_id: int) -> NCR:
        ncr = await self.ncrs.get_in_project(ncr_id, project.project_id)
        if not ncr:
            raise NotFoundError("NCR")
        return ncr

    @staticmethod
    def _ensure_mutable(ncr: NCR) -> None:
        if ncr.status == NCRStatus.CLOSED:
            raise NCRStateError(
                "Reopen this NCR before changing its corrective actions or penalties"
            )

    async def _validate_user(self, user_id: int | None) -> None:
        if user_id is None:
            return
        if not await self.session.get(User, user_id):
            raise NotFoundError("User")

    async def _user_name(self, user_id: int | None) -> str | None:
        if user_id is None:
            return None
        u = await self.session.get(User, user_id)
        return getattr(u, "full_name", None) if u else None

    async def _base_fields(self, ncr: NCR) -> dict:
        test = await self.session.get(CubeTest, ncr.test_id)
        sample = await self.session.get(CubeSample, test.sample_id) if test else None
        pour = await self.session.get(Pour, ncr.pour_id)
        tower = await self.session.get(Tower, pour.tower_id) if pour else None
        floor = await self.session.get(Floor, pour.floor_id) if pour else None
        component = await self.session.get(Component, pour.component_id) if pour else None
        grade = await self.session.get(Grade, pour.grade_id) if pour else None
        return dict(
            ncr_id=ncr.ncr_id,
            ncr_number=ncr.ncr_number,
            test_id=ncr.test_id,
            pour_id=ncr.pour_id,
            status=ncr.status,
            root_cause=ncr.root_cause,
            raised_by=ncr.raised_by,
            raised_by_name=await self._user_name(ncr.raised_by),
            raised_at=ncr.raised_at,
            closed_at=ncr.closed_at,
            result_status=test.result_status if test else None,
            observed_strength_mpa=test.observed_strength_mpa if test else None,
            required_strength_mpa=test.required_strength_mpa if test else None,
            test_age_days=test.test_age_days if test else None,
            sample_reference=sample.sample_reference if sample else None,
            grade_name=grade.grade_name if grade else None,
            tower_name=tower.tower_name if tower else None,
            floor_label=floor.floor_label if floor else None,
            component_type=component.component_type.value if component else None,
        )

    @staticmethod
    def _counts(actions: list[CorrectiveAction], penalties: list[Penalty]) -> dict:
        return dict(
            corrective_action_count=len(actions),
            open_action_count=sum(
                1 for a in actions if a.status != ActionStatus.COMPLETED
            ),
            penalty_count=len(penalties),
        )

    async def _summary(
        self,
        ncr: NCR,
        *,
        actions: list[CorrectiveAction],
        penalties: list[Penalty],
    ) -> NCRResponse:
        return NCRResponse(
            **await self._base_fields(ncr),
            **self._counts(actions, penalties),
        )

    async def _detail(self, ncr: NCR) -> NCRDetailResponse:
        actions = await self.actions.list_for_ncr(ncr.ncr_id)
        penalties = await self.penalties.list_for_ncr(ncr.ncr_id)
        return NCRDetailResponse(
            **await self._base_fields(ncr),
            **self._counts(actions, penalties),
            corrective_actions=[await self._action_response(a) for a in actions],
            penalties=[await self._penalty_response(p) for p in penalties],
        )

    async def _action_response(
        self, action: CorrectiveAction
    ) -> CorrectiveActionResponse:
        return CorrectiveActionResponse(
            action_id=action.action_id,
            ncr_id=action.ncr_id,
            action_description=action.action_description,
            assigned_to=action.assigned_to,
            assigned_to_name=await self._user_name(action.assigned_to),
            due_date=action.due_date,
            status=action.status,
            created_at=action.created_at,
        )

    async def _penalty_response(self, penalty: Penalty) -> PenaltyResponse:
        return PenaltyResponse(
            penalty_id=penalty.penalty_id,
            ncr_id=penalty.ncr_id,
            penalty_type=penalty.penalty_type,
            amount=penalty.amount,
            description=penalty.description,
            applied_by=penalty.applied_by,
            applied_by_name=await self._user_name(penalty.applied_by),
            applied_at=penalty.applied_at,
        )
