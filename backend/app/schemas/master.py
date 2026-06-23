"""
schemas/master.py
-----------------
Pydantic v2 request/response models for master data: projects (+towers),
suppliers and testing labs.

Response models are scalar-only (no ORM relationships) so they never trigger
async lazy-loading. Where nested data is returned, the service builds it
explicitly from objects it already holds.
"""

from datetime import date, datetime

from pydantic import BaseModel, EmailStr

from app.models.master import LabType, ProjectStatus, ProjectType

# ---------------------------------------------------------------------------
# Towers
# ---------------------------------------------------------------------------

class TowerCreate(BaseModel):
    tower_name: str
    tower_code: str | None = None
    tower_description: str | None = None
    tower_type: str | None = None
    floors_total: int | None = None
    no_of_flats: int | None = None
    flats_per_floor: int | None = None
    no_of_basements: int | None = None
    floor_height_m: float | None = None
    start_label: str | None = None
    construction_start_date: date | None = None


class TowerResponse(BaseModel):
    tower_id: int
    project_id: int
    tower_name: str
    tower_code: str | None
    tower_type: str | None
    floors_total: int | None
    no_of_flats: int | None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------

class ProjectCreate(BaseModel):
    project_name: str
    project_type: ProjectType | None = None
    project_code: str | None = None
    status: ProjectStatus = ProjectStatus.ACTIVE
    gst_number: str | None = None
    # Location
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    pin_code: str | None = None
    geo_coordinates: str | None = None
    project_location: str | None = None
    site_area_sqm: float | None = None
    # Timeline & scope
    start_date: date | None = None
    end_date: date | None = None
    builtup_area_sqft: float | None = None
    no_of_towers: int | None = None
    no_of_basements: int | None = None
    max_floors: int | None = None
    no_of_flats: int | None = None
    # Quality parameters
    acceptance_criteria: str | None = None
    min_cube_samples: str | None = None
    early_test_age_days: int | None = None
    mid_test_age_days: int | None = None
    final_test_age_days: int | None = None
    characteristic_strength_pct: float | None = None
    ncr_trigger: str | None = None
    # Nested towers (optional)
    towers: list[TowerCreate] = []


class ProjectResponse(BaseModel):
    project_id: int
    org_id: int
    project_name: str
    project_type: ProjectType | None
    project_code: str | None
    project_location: str | None
    status: ProjectStatus
    city: str | None
    state: str | None
    start_date: date | None
    end_date: date | None
    no_of_towers: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Suppliers
# ---------------------------------------------------------------------------

class SupplierCreate(BaseModel):
    supplier_name: str
    plant_name: str | None = None
    plant_location: str | None = None
    gst_number: str | None = None
    pan_number: str | None = None
    plant_distance_km: float | None = None
    transit_time_mins: int | None = None
    contact_email: EmailStr | None = None
    contact_phone: str | None = None
    primary_contact_name: str | None = None
    primary_contact_designation: str | None = None
    dispatch_manager_name: str | None = None
    dispatch_mobile: str | None = None
    plant_capacity_cum_hr: float | None = None
    no_transit_mixers: int | None = None
    no_concrete_pumps: int | None = None
    qms_certification: str | None = None


class SupplierResponse(BaseModel):
    supplier_id: int
    contractor_org_id: int
    project_id: int | None
    supplier_name: str
    plant_name: str | None
    plant_location: str | None
    gst_number: str | None
    plant_distance_km: float | None
    contact_email: str | None
    contact_phone: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Testing labs
# ---------------------------------------------------------------------------

class LabCreate(BaseModel):
    lab_name: str
    lab_type: LabType = LabType.THIRD_PARTY
    registration_number: str | None = None
    gst_number: str | None = None
    accreditation_no: str | None = None
    address_line1: str | None = None
    city: str | None = None
    state: str | None = None
    contact_email: EmailStr | None = None
    contact_phone: str | None = None
    lab_manager_name: str | None = None
    alternate_phone: str | None = None
    nabl_accredited: str | None = None
    nabl_certificate_no: str | None = None
    nabl_expiry_date: date | None = None
    ctm_calibration_status: str | None = None
    ctm_calibration_expiry: date | None = None
    ctm_capacity_kn: float | None = None


class LabResponse(BaseModel):
    lab_id: int
    contractor_org_id: int
    project_id: int | None
    lab_name: str
    lab_type: LabType
    registration_number: str | None
    accreditation_no: str | None
    city: str | None
    state: str | None
    contact_email: str | None
    contact_phone: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Project membership, contractors, and access (project-scoped model)
# ---------------------------------------------------------------------------

class ProjectMemberCreate(BaseModel):
    """Assign someone to a project. If a user with this email already exists in
    the caller's org they're assigned directly; otherwise they're invited."""
    email: EmailStr
    project_role: str  # app.models.auth.ProjectRole value


class ProjectMemberResponse(BaseModel):
    email: str
    full_name: str | None
    project_role: str
    status: str  # ACTIVE | UNVERIFIED | INVITED
    user_id: int | None
    assigned_at: datetime | None


class ProjectContractorCreate(BaseModel):
    """Bring a contractor onto a project — either an existing contractor org
    (contractor_org_id) or a brand-new one (org_name + contact_email)."""
    contractor_org_id: int | None = None
    org_name: str | None = None
    contact_email: EmailStr | None = None
    contact_phone: str | None = None
    scope: str | None = None


class ProjectContractorResponse(BaseModel):
    pc_id: int
    project_id: int
    contractor_org_id: int
    contractor_org_name: str
    status: str  # PENDING | ACCEPTED | DECLINED
    scope: str | None
    assigned_at: datetime
    responded_at: datetime | None


class AssignedProjectResponse(BaseModel):
    """A contractor org's view of a project it's been assigned to (accept screen)."""
    pc_id: int
    project_id: int
    project_name: str
    project_code: str | None
    city: str | None
    state: str | None
    status: str
    scope: str | None
    assigned_at: datetime


class ProjectAccess(BaseModel):
    """The viewer's capabilities on a project — drives role-aware UI."""
    side: str  # CLIENT | CONTRACTOR
    can_manage_client_side: bool
    can_manage_contractor_side: bool
    is_contractor_admin: bool


class ProjectDetailResponse(ProjectResponse):
    access: ProjectAccess
