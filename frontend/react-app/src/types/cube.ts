// Cube samples + strength tests (Phase 4) and the lab report token flow.

// app.models.quality.ResultStatus
export type ResultStatus = 'PENDING' | 'PASS' | 'FAIL' | 'CRITICAL_FAILURE';

export interface CubeSampleCreate {
  sample_reference?: string | null;
  cast_date: string; // ISO date
  no_of_cubes?: number;
  lab_id?: number | null;
  lab_dispatch_date?: string | null; // ISO date
  expected_result_date?: string | null; // ISO date
  lab_dispatch_notes?: string | null;
}

export interface CubeTestResponse {
  test_id: number;
  sample_id: number;
  test_age_days: number;
  test_date: string;
  observed_strength_mpa: number;
  required_strength_mpa: number;
  result_status: ResultStatus;
  lab_id: number | null;
  lab_name: string | null;
  lab_report_reference: string | null;
  report_document_id: number | null;
  submitted_by_lab: boolean;
  ncr_id: number | null;
  ncr_number: string | null;
  created_at: string;
}

export interface CubeSampleResponse {
  sample_id: number;
  pour_id: number;
  sample_reference: string | null;
  cast_date: string;
  no_of_cubes: number;
  lab_id: number | null;
  lab_name: string | null;
  lab_dispatch_date: string | null;
  expected_result_date: string | null;
  lab_dispatch_notes: string | null;
  report_link_sent: boolean;
  cube_received_on: string | null;
  testing_started_on: string | null;
  created_at: string;
  pour_reference: string | null;
  tower_name: string | null;
  floor_label: string | null;
  component_type: string | null;
  grade_name: string | null;
  grade_min_strength_mpa: number | null;
  tests: CubeTestResponse[];
}

// ── Lab report token flow (mirrors app/schemas/lab_report.py) ──────────────────

export const REPORT_AGES = [7, 14, 28] as const;

export interface LabReportMilestone {
  test_age_days: number;
  due_date: string | null;
  submitted: boolean;
  test_date: string | null;
  observed_strength_mpa: number | null;
  required_strength_mpa: number | null;
  result_status: ResultStatus | null;
  has_report_pdf: boolean;
}

export interface LabReportView {
  project_name: string | null;
  lab_name: string | null;
  sample_reference: string | null;
  grade_name: string | null;
  grade_min_strength_mpa: number | null;
  pour_reference: string | null;
  cast_date: string | null;
  no_of_cubes: number | null;
  cube_received_on: string | null;
  testing_started_on: string | null;
  is_expired: boolean;
  milestones: LabReportMilestone[];
}

export interface LabReportStart {
  testing_started_on: string;
  cube_received_on?: string | null;
}

export interface LabReportSubmit {
  test_age_days: number;
  observed_strength_mpa: number;
  test_date?: string | null;
  lab_report_reference?: string | null;
}

export interface LabReportResult {
  test_age_days: number;
  result_status: ResultStatus;
  observed_strength_mpa: number;
  required_strength_mpa: number;
  ncr_raised: boolean;
  message: string;
}

export interface LabReportLink {
  token: string;
  report_url: string;
  sent: boolean;
}
