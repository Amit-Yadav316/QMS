// Mix designs API — project-scoped wrappers over /projects/{id}/mix-designs.
// See backend/app/routers/mix_designs.py.

import { api } from './client';
import type { GradeResponse, MixDesignCreate, MixDesignResponse } from '../types/master';

export const mixDesignsApi = {
  list(projectId: number): Promise<MixDesignResponse[]> {
    return api
      .get<MixDesignResponse[]>(`/projects/${projectId}/mix-designs`)
      .then((r) => r.data);
  },
  // Grades with an APPROVED mix design — the only grades a pour may use.
  approvedGrades(projectId: number): Promise<GradeResponse[]> {
    return api
      .get<GradeResponse[]>(`/projects/${projectId}/mix-designs/approved-grades`)
      .then((r) => r.data);
  },
  create(projectId: number, data: MixDesignCreate): Promise<MixDesignResponse> {
    return api
      .post<MixDesignResponse>(`/projects/${projectId}/mix-designs`, data)
      .then((r) => r.data);
  },
};
