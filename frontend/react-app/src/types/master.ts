// TypeScript mirrors of the backend master-data Pydantic schemas
// (backend/app/schemas/master.py). Keep these in sync with the API.

// ── Enums (mirror app.models.master) ───────────────────────────────────────

// app.models.master.ProjectStatus
export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';

// app.models.master.ProjectType
export type ProjectType =
  | 'RESIDENTIAL'
  | 'COMMERCIAL'
  | 'MIXED_USE'
  | 'INFRASTRUCTURE';

// app.models.master.LabType
export type LabType = 'IN_HOUSE' | 'THIRD_PARTY';

// ── Towers ──────────────────────────────────────────────────────────────────

export interface TowerCreate {
  tower_name: string;
  tower_code?: string | null;
  tower_description?: string | null;
  tower_type?: string | null;
  floors_total?: number | null;
  no_of_flats?: number | null;
  flats_per_floor?: number | null;
  no_of_basements?: number | null;
  floor_height_m?: number | null;
  start_label?: string | null;
  construction_start_date?: string | null; // ISO date (YYYY-MM-DD)
}

export interface TowerResponse {
  tower_id: number;
  project_id: number;
  tower_name: string;
  tower_code: string | null;
  tower_type: string | null;
  floors_total: number | null;
  no_of_flats: number | null;
}

// ── Projects ──────────────────────────────────────────────────────────────

export interface ProjectCreate {
  project_name: string;
  project_type?: ProjectType | null;
  project_code?: string | null;
  status?: ProjectStatus;
  gst_number?: string | null;
  // Location
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pin_code?: string | null;
  geo_coordinates?: string | null;
  project_location?: string | null;
  site_area_sqm?: number | null;
  // Timeline & scope
  start_date?: string | null; // ISO date
  end_date?: string | null; // ISO date
  builtup_area_sqft?: number | null;
  no_of_towers?: number | null;
  no_of_basements?: number | null;
  max_floors?: number | null;
  no_of_flats?: number | null;
  // Quality parameters
  acceptance_criteria?: string | null;
  min_cube_samples?: string | null;
  early_test_age_days?: number | null;
  mid_test_age_days?: number | null;
  final_test_age_days?: number | null;
  characteristic_strength_pct?: number | null;
  ncr_trigger?: string | null;
  // Nested towers (optional)
  towers?: TowerCreate[];
}

export interface ProjectResponse {
  project_id: number;
  org_id: number;
  project_name: string;
  project_type: ProjectType | null;
  project_code: string | null;
  project_location: string | null;
  status: ProjectStatus;
  city: string | null;
  state: string | null;
  start_date: string | null;
  end_date: string | null;
  no_of_towers: number | null;
  created_at: string;
}

// ── Suppliers ─────────────────────────────────────────────────────────────

export interface SupplierCreate {
  supplier_name: string;
  plant_name?: string | null;
  plant_location?: string | null;
  gst_number?: string | null;
  pan_number?: string | null;
  plant_distance_km?: number | null;
  transit_time_mins?: number | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  primary_contact_name?: string | null;
  primary_contact_designation?: string | null;
  dispatch_manager_name?: string | null;
  dispatch_mobile?: string | null;
  plant_capacity_cum_hr?: number | null;
  no_transit_mixers?: number | null;
  no_concrete_pumps?: number | null;
  qms_certification?: string | null;
}

export interface SupplierResponse {
  supplier_id: number;
  contractor_org_id: number;
  supplier_name: string;
  plant_name: string | null;
  plant_location: string | null;
  gst_number: string | null;
  plant_distance_km: number | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Testing labs ────────────────────────────────────────────────────────────

export interface LabCreate {
  lab_name: string;
  lab_type?: LabType;
  registration_number?: string | null;
  gst_number?: string | null;
  accreditation_no?: string | null;
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  lab_manager_name?: string | null;
  alternate_phone?: string | null;
  nabl_accredited?: string | null;
  nabl_certificate_no?: string | null;
  nabl_expiry_date?: string | null; // ISO date
  ctm_calibration_status?: string | null;
  ctm_calibration_expiry?: string | null; // ISO date
  ctm_capacity_kn?: number | null;
}

export interface LabResponse {
  lab_id: number;
  contractor_org_id: number;
  lab_name: string;
  lab_type: LabType;
  registration_number: string | null;
  accreditation_no: string | null;
  city: string | null;
  state: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
}
