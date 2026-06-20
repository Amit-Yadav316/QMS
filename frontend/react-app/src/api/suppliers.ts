// Suppliers API — thin typed wrappers over the backend /suppliers endpoints.
// See backend/app/routers/suppliers.py.

import { api } from './client';
import type { SupplierCreate, SupplierResponse } from '../types/master';

export const suppliersApi = {
  // CONTRACTOR_ADMIN / PROJECT_MANAGER.
  create(data: SupplierCreate): Promise<SupplierResponse> {
    return api.post<SupplierResponse>('/suppliers', data).then((r) => r.data);
  },

  // Any authenticated user — scoped to their organisation.
  list(): Promise<SupplierResponse[]> {
    return api.get<SupplierResponse[]>('/suppliers').then((r) => r.data);
  },
};
