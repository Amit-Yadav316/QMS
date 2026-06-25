// NCR lifecycle API — project-scoped wrappers over the Phase 5 endpoints:
// the NCR list/detail plus root-cause/status updates, corrective actions, and
// penalties. See backend/app/routers/ncrs.py.

import { api } from './client';
import type {
  CorrectiveActionCreate,
  CorrectiveActionResponse,
  CorrectiveActionUpdate,
  NCRDetailResponse,
  NCRResponse,
  NCRUpdate,
  PenaltyCreate,
  PenaltyResponse,
} from '../types/master';

export const ncrsApi = {
  // ── Reads (any project viewer) ────────────────────────────────────────────

  list(projectId: number): Promise<NCRResponse[]> {
    return api.get<NCRResponse[]>(`/projects/${projectId}/ncrs`).then((r) => r.data);
  },

  get(projectId: number, ncrId: number): Promise<NCRDetailResponse> {
    return api
      .get<NCRDetailResponse>(`/projects/${projectId}/ncrs/${ncrId}`)
      .then((r) => r.data);
  },

  // ── Lifecycle (QUALITY_ENGINEER) ──────────────────────────────────────────

  update(projectId: number, ncrId: number, data: NCRUpdate): Promise<NCRDetailResponse> {
    return api
      .patch<NCRDetailResponse>(`/projects/${projectId}/ncrs/${ncrId}`, data)
      .then((r) => r.data);
  },

  addCorrectiveAction(
    projectId: number,
    ncrId: number,
    data: CorrectiveActionCreate,
  ): Promise<CorrectiveActionResponse> {
    return api
      .post<CorrectiveActionResponse>(
        `/projects/${projectId}/ncrs/${ncrId}/corrective-actions`,
        data,
      )
      .then((r) => r.data);
  },

  updateCorrectiveAction(
    projectId: number,
    ncrId: number,
    actionId: number,
    data: CorrectiveActionUpdate,
  ): Promise<CorrectiveActionResponse> {
    return api
      .patch<CorrectiveActionResponse>(
        `/projects/${projectId}/ncrs/${ncrId}/corrective-actions/${actionId}`,
        data,
      )
      .then((r) => r.data);
  },

  addPenalty(
    projectId: number,
    ncrId: number,
    data: PenaltyCreate,
  ): Promise<PenaltyResponse> {
    return api
      .post<PenaltyResponse>(`/projects/${projectId}/ncrs/${ncrId}/penalties`, data)
      .then((r) => r.data);
  },
};
