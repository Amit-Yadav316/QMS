// Cube tests API — project-scoped wrappers over the Phase 4 endpoints: cube
// samples plus the lab report dispatch helpers. Strength results now come from
// the lab through its tokenised link (see api/labReport.ts); the QE casts the
// sample and can copy/resend the lab's link. NCRs are auto-raised on a failing
// 28-day result. See backend/app/routers/cube_tests.py.

import { api } from './client';
import type { CubeSampleCreate, CubeSampleResponse, LabReportLink } from '../types/master';

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

  // ── Lab report dispatch (QUALITY_ENGINEER) ────────────────────────────────

  // The lab's tokenised report URL, to copy/share. Mints a token if needed; no email.
  getReportLink(projectId: number, sampleId: number): Promise<LabReportLink> {
    return api
      .post<LabReportLink>(`/projects/${projectId}/samples/${sampleId}/report-link`)
      .then((r) => r.data);
  },

  // Re-email the lab its report link — the manual nudge when a milestone is due.
  resendReportLink(projectId: number, sampleId: number): Promise<CubeSampleResponse> {
    return api
      .post<CubeSampleResponse>(`/projects/${projectId}/samples/${sampleId}/resend-report-link`)
      .then((r) => r.data);
  },

  // Download a lab-submitted report PDF through the project document store (the
  // blob goes through `api` so the bearer token is attached).
  async downloadReport(projectId: number, documentId: number): Promise<void> {
    const res = await api.get(
      `/projects/${projectId}/documents/${documentId}/download`,
      { responseType: 'blob' },
    );
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lab-report-${documentId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
