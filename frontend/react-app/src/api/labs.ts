// Testing labs API — thin typed wrappers over the backend /labs endpoints.
// See backend/app/routers/labs.py.
//
// Note: these endpoints require an authenticated CONTRACTOR_ADMIN /
// PROJECT_MANAGER. The public external-lab self-registration via invitation
// token (used by /external/lab-registration) is a later-phase backend concern
// and is not yet available here.

import { api } from './client';
import type { LabCreate, LabResponse } from '../types/master';

export const labsApi = {
  // CONTRACTOR_ADMIN / PROJECT_MANAGER.
  create(data: LabCreate): Promise<LabResponse> {
    return api.post<LabResponse>('/labs', data).then((r) => r.data);
  },

  // Any authenticated user — scoped to their organisation.
  list(): Promise<LabResponse[]> {
    return api.get<LabResponse[]>('/labs').then((r) => r.data);
  },
};
