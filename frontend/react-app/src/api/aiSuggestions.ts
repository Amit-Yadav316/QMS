// AI suggestion (RAG) API — project-scoped wrappers over the Phase 9 endpoints
// hung off an NCR: generate a root-cause / corrective-action suggestion grounded
// in similar past CLOSED NCRs, read the latest one, and apply it to the NCR.
// See backend/app/routers/ai_suggestions.py.

import { api } from './client';
import type {
  AISuggestionApply,
  AISuggestionResponse,
  NCRDetailResponse,
} from '../types/master';

export const aiSuggestionsApi = {
  // Latest stored suggestion for an NCR (404 if none generated yet) — any viewer.
  get(projectId: number, ncrId: number): Promise<AISuggestionResponse> {
    return api
      .get<AISuggestionResponse>(`/projects/${projectId}/ncrs/${ncrId}/ai-suggestion`)
      .then((r) => r.data);
  },

  // Generate (or regenerate) a suggestion — QUALITY_ENGINEER only.
  generate(projectId: number, ncrId: number): Promise<AISuggestionResponse> {
    return api
      .post<AISuggestionResponse>(`/projects/${projectId}/ncrs/${ncrId}/ai-suggestion`)
      .then((r) => r.data);
  },

  // Accept a suggestion: copy the root cause onto the NCR and turn the suggested
  // actions into real corrective actions — QUALITY_ENGINEER only.
  apply(
    projectId: number,
    ncrId: number,
    data: AISuggestionApply = {},
  ): Promise<NCRDetailResponse> {
    return api
      .post<NCRDetailResponse>(
        `/projects/${projectId}/ncrs/${ncrId}/ai-suggestion/apply`,
        data,
      )
      .then((r) => r.data);
  },
};
