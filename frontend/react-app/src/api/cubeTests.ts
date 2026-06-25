// Cube tests API — project-scoped wrappers over the Phase 4 endpoints:
// cube samples and strength tests (NCRs are auto-raised on failure; the NCR
// lifecycle lives in api/ncrs.ts). See backend/app/routers/cube_tests.py.

import { api } from './client';
import type {
  CubeSampleCreate,
  CubeSampleResponse,
  CubeTestCreate,
  CubeTestResponse,
} from '../types/master';

export const cubeTestsApi = {
  // ── Samples (QUALITY_ENGINEER casts; any viewer reads) ────────────────────

  castSample(
    projectId: number,
    pourId: number,
    data: CubeSampleCreate,
  ): Promise<CubeSampleResponse> {
    return api
      .post<CubeSampleResponse>(`/projects/${projectId}/pours/${pourId}/samples`, data)
      .then((r) => r.data);
  },

  listSamplesForPour(projectId: number, pourId: number): Promise<CubeSampleResponse[]> {
    return api
      .get<CubeSampleResponse[]>(`/projects/${projectId}/pours/${pourId}/samples`)
      .then((r) => r.data);
  },

  listSamples(projectId: number): Promise<CubeSampleResponse[]> {
    return api
      .get<CubeSampleResponse[]>(`/projects/${projectId}/samples`)
      .then((r) => r.data);
  },

  // ── Tests (QUALITY_ENGINEER) — grading + auto-NCR happen server-side ──────

  recordTest(
    projectId: number,
    sampleId: number,
    data: CubeTestCreate,
  ): Promise<CubeTestResponse> {
    return api
      .post<CubeTestResponse>(`/projects/${projectId}/samples/${sampleId}/tests`, data)
      .then((r) => r.data);
  },
};
