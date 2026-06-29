// Phase 6: traceability.

export interface TraceRecord {
  sample_id: number;
  sample_reference: string | null;
  pour_id: number;
  pour_reference: string | null;
  cast_date: string;
  tower_name: string | null;
  floor_label: string | null;
  component_type: string | null;
  grade_name: string | null;
  supplier_name: string | null;
  result_status: string | null;
  ncr_number: string | null;
}

export interface TraceTest {
  test_id: number;
  test_age_days: number;
  test_date: string;
  observed_strength_mpa: number;
  required_strength_mpa: number;
  result_status: string;
  lab_name: string | null;
  ncr_id: number | null;
  ncr_number: string | null;
}

export interface TraceTruck {
  dispatch_token_id: number;
  vehicle_number: string | null;
  driver_name: string | null;
  batch_number: string | null;
  challan_number: string | null;
  volume_cum: number | null;
  slump_at_plant_mm: number | null;
  status: string;
  supplier_name: string | null;
  grade_name: string | null;
}

export interface TraceDetail {
  sample_id: number;
  sample_reference: string | null;
  cast_date: string;
  lab_name: string | null;
  pour_id: number;
  pour_reference: string | null;
  pour_date: string;
  volume_cum: number | null;
  pour_status: string;
  tower_name: string | null;
  floor_label: string | null;
  component_type: string | null;
  grade_name: string | null;
  supplier_name: string | null;
  tests: TraceTest[];
  trucks: TraceTruck[];
}
