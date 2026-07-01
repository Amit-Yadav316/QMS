"""
schemas/lab_report.py
---------------------
DTOs for the passwordless lab cube-report submission flow.

A lab receives one tokenised link when the QE dispatches a cube sample to it.
Through that link the lab first establishes the testing day, then submits the
7-, 14- and 28-day strength reports (each optionally with a PDF). The submitted
results land directly in the cube-results section — the QE no longer types them.

Like the other public views, response models are scalar-only (built explicitly
by the service) so they never trigger async lazy-loading.
"""

from datetime import date

from pydantic import BaseModel

from app.models.quality import ResultStatus

# The acceptance milestones a lab reports against (days from the testing day).
# The 28-day result is the IS 456 acceptance test — only it can raise an NCR.
REPORT_AGES: tuple[int, ...] = (7, 14, 28)
ACCEPTANCE_AGE_DAYS = 28


class LabReportMilestone(BaseModel):
    """One 7/14/28-day milestone, with its schedule + any submitted result."""

    test_age_days: int
    due_date: date | None = None  # testing_started_on + age (None until started)
    submitted: bool = False
    test_date: date | None = None
    observed_strength_mpa: float | None = None
    required_strength_mpa: float | None = None
    result_status: ResultStatus | None = None
    has_report_pdf: bool = False


class LabReportView(BaseModel):
    """What the lab sees on the report page (GET)."""

    project_name: str | None = None
    lab_name: str | None = None
    sample_reference: str | None = None
    grade_name: str | None = None
    grade_min_strength_mpa: float | None = None
    pour_reference: str | None = None
    cast_date: date | None = None
    no_of_cubes: int | None = None
    cube_received_on: date | None = None
    testing_started_on: date | None = None
    is_expired: bool = False
    milestones: list[LabReportMilestone] = []


class LabReportStart(BaseModel):
    """First action: the lab fixes the day testing/curing started, and
    optionally records when it received the cubes."""

    testing_started_on: date
    cube_received_on: date | None = None


class LabReportSubmit(BaseModel):
    """One milestone strength report. The PDF (if any) rides as multipart and is
    not part of this body. ``test_date`` defaults to ``testing_started_on + age``
    when the lab omits it."""

    test_age_days: int
    observed_strength_mpa: float
    test_date: date | None = None
    lab_report_reference: str | None = None


class LabReportResult(BaseModel):
    """Outcome of submitting one milestone (POST)."""

    test_age_days: int
    result_status: ResultStatus
    observed_strength_mpa: float
    required_strength_mpa: float
    ncr_raised: bool = False
    message: str


class LabReportLink(BaseModel):
    """The lab's tokenised report URL — for the QE to copy/share (no email)."""

    token: str
    report_url: str
    sent: bool = False
