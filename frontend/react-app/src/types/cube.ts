// Cube samples + strength tests (Phase 4).

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

export interface CubeTestCreate {
  test_age_days: number;
  test_date: string; // ISO date
  observed_strength_mpa: number;
  required_strength_mpa?: number | null; // omit → engine derives from grade + age
  lab_id?: number | null;
  lab_report_reference?: string | null;
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
  created_at: string;
  pour_reference: string | null;
  tower_name: string | null;
  floor_label: string | null;
  component_type: string | null;
  grade_name: string | null;
  grade_min_strength_mpa: number | null;
  tests: CubeTestResponse[];
}
