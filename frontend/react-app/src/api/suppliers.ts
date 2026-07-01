// Suppliers API — project-scoped wrappers over /projects/{id}/suppliers.
// See backend/app/routers/suppliers.py.

import { api } from './client';
import type { SupplierCreate, SupplierResponse } from '../types/master';

export const suppliersApi = {
  // Contractor side (CONTRACTOR_ADMIN of an accepted org, or CONTRACTOR_LEAD).
  create(projectId: number, data: SupplierCreate): Promise<SupplierResponse> {
    return api
      .post<SupplierResponse>(`/projects/${projectId}/suppliers`, data)
      .then((r) => r.data);
  },

  // Anyone who can view the project.
  list(projectId: number): Promise<SupplierResponse[]> {
    return api
      .get<SupplierResponse[]>(`/projects/${projectId}/suppliers`)
      .then((r) => r.data);
  },

  // Re-send the confirmation email (contractor side).
  resendConfirmation(projectId: number, supplierId: number): Promise<SupplierResponse> {
    return api
      .post<SupplierResponse>(
        `/projects/${projectId}/suppliers/${supplierId}/resend-confirmation`,
      )
      .then((r) => r.data);
  },

  // Block / unblock (QE, PM, or contractor). Block needs a reason.
  block(projectId: number, supplierId: number, reason: string): Promise<SupplierResponse> {
    return api
      .post<SupplierResponse>(`/projects/${projectId}/suppliers/${supplierId}/block`, { reason })
      .then((r) => r.data);
  },
  unblock(projectId: number, supplierId: number): Promise<SupplierResponse> {
    return api
      .post<SupplierResponse>(`/projects/${projectId}/suppliers/${supplierId}/unblock`)
      .then((r) => r.data);
  },
};
