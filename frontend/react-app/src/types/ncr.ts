// NCRs + lifecycle (Phase 5).

import type { ResultStatus } from './cube';

// app.models.quality.NCRStatus
export type NCRStatus = 'OPEN' | 'UNDER_REVIEW' | 'CLOSED';
// app.models.quality.ActionStatus
export type ActionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
// app.models.quality.PenaltyType
export type PenaltyType = 'RATE_REDUCTION' | 'REJECTION' | 'DEMOLITION';

export interface NCRResponse {
  ncr_id: number;
  ncr_number: string | null;
  test_id: number;
  pour_id: number;
  status: NCRStatus;
  root_cause: string | null;
  raised_by: number | null;
  raised_by_name: string | null;
  raised_at: string;
  closed_at: string | null;
  result_status: ResultStatus | null;
  observed_strength_mpa: number | null;
  required_strength_mpa: number | null;
  test_age_days: number | null;
  sample_reference: string | null;
  grade_name: string | null;
  tower_name: string | null;
  floor_label: string | null;
  component_type: string | null;
  corrective_action_count: number;
  open_action_count: number;
  penalty_count: number;
}

export interface NCRUpdate {
  status?: NCRStatus;
  root_cause?: string | null;
}

export interface CorrectiveActionCreate {
  action_description: string;
  assigned_to?: number | null;
  due_date?: string | null; // ISO date
}

export interface CorrectiveActionUpdate {
  action_description?: string | null;
  assigned_to?: number | null;
  due_date?: string | null; // ISO date
  status?: ActionStatus;
}

export interface CorrectiveActionResponse {
  action_id: number;
  ncr_id: number;
  action_description: string;
  assigned_to: number | null;
  assigned_to_name: string | null;
  due_date: string | null;
  status: ActionStatus;
  created_at: string;
}

export interface PenaltyCreate {
  penalty_type: PenaltyType;
  amount?: number | null;
  description?: string | null;
}

export interface PenaltyResponse {
  penalty_id: number;
  ncr_id: number;
  penalty_type: PenaltyType;
  amount: number | null;
  description: string | null;
  applied_by: number | null;
  applied_by_name: string | null;
  applied_at: string;
}

export interface NCRDetailResponse extends NCRResponse {
  corrective_actions: CorrectiveActionResponse[];
  penalties: PenaltyResponse[];
}
