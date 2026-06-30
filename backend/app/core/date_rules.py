"""date_rules.py — pure date-ordering checks for the timeline integrity rules.

Kept free of I/O (like ``quality_engine``) so it unit-tests directly. Services
call ``ensure_not_after`` after they've already loaded the related rows, to
reject impossible timelines (a cube cast before its pour, a project ending before
it starts, the lab chain out of order, …).

Every check is **lenient by design**: it skips when either date is missing and
treats equal dates as valid (same-day events are normal in construction). This
keeps the rules off optional/unset dates and only bites genuinely-inverted ones.
"""

from datetime import date

from app.core.exceptions import DateIntegrityError


def ensure_not_after(
    earlier: date | None,
    later: date | None,
    *,
    earlier_label: str,
    later_label: str,
) -> None:
    """Require ``earlier <= later`` when both dates are present.

    No-op when either is ``None`` (the date wasn't recorded). Raises
    :class:`DateIntegrityError` (HTTP 400) otherwise, naming both ends so the
    message is actionable.
    """
    if earlier is None or later is None:
        return
    if earlier > later:
        raise DateIntegrityError(
            f"{later_label} ({later.isoformat()}) cannot be before "
            f"{earlier_label} ({earlier.isoformat()})."
        )
