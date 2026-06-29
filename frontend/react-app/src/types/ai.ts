// AI suggestion / RAG (Phase 9).
// A RAG-backed root-cause / corrective-action suggestion for a failing NCR,
// grounded in similar past CLOSED NCRs. See backend/app/routers/ai_suggestions.py.

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface RetrievedNCR {
  ncr_id: number;
  ncr_number: string | null;
  similarity: number;
  grade_name: string | null;
  result_status: string | null;
  root_cause: string | null;
  corrective_actions: string[];
}

export interface AISuggestionResponse {
  suggestion_id: number;
  ncr_id: number;
  test_id: number;
  root_cause_text: string | null;
  corrective_actions: string[];
  confidence_level: ConfidenceLevel | null;
  ndt_recommended: boolean;
  retrieved: RetrievedNCR[];
  generated_at: string;
}

export interface AISuggestionApply {
  apply_root_cause?: boolean;
  apply_corrective_actions?: boolean;
}
