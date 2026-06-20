// Projects API — thin typed wrappers over the backend /projects endpoints.
// See backend/app/routers/projects.py.

import { api } from './client';
import type { ProjectCreate, ProjectResponse } from '../types/master';

export const projectsApi = {
  // CLIENT_ADMIN only.
  create(data: ProjectCreate): Promise<ProjectResponse> {
    return api.post<ProjectResponse>('/projects', data).then((r) => r.data);
  },

  // Any authenticated user — scoped to their organisation.
  list(): Promise<ProjectResponse[]> {
    return api.get<ProjectResponse[]>('/projects').then((r) => r.data);
  },
};
