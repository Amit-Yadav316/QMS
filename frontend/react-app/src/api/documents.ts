// Documents API — project-scoped wrappers over /projects/{id}/documents.
// See backend/app/routers/documents.py.
//
// Upload is multipart/form-data: axios v1 detects the FormData body and sets the
// correct Content-Type (with boundary) itself, overriding the JSON default on the
// shared client. Download fetches the blob through `api` (so the bearer token is
// attached) and saves it client-side.

import { api } from './client';
import type { DocumentResponse, DocumentReview } from '../types/master';

export const documentsApi = {
  list(projectId: number): Promise<DocumentResponse[]> {
    return api
      .get<DocumentResponse[]>(`/projects/${projectId}/documents`)
      .then((r) => r.data);
  },

  upload(
    projectId: number,
    file: File,
    opts: { documentType?: string; title?: string } = {},
  ): Promise<DocumentResponse> {
    const form = new FormData();
    form.append('file', file);
    if (opts.documentType) form.append('document_type', opts.documentType);
    if (opts.title) form.append('title', opts.title);
    return api
      .post<DocumentResponse>(`/projects/${projectId}/documents`, form)
      .then((r) => r.data);
  },

  async download(projectId: number, doc: DocumentResponse): Promise<void> {
    const res = await api.get(
      `/projects/${projectId}/documents/${doc.document_id}/download`,
      { responseType: 'blob' },
    );
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.original_filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  remove(projectId: number, documentId: number): Promise<void> {
    return api
      .delete(`/projects/${projectId}/documents/${documentId}`)
      .then(() => undefined);
  },

  // QE / PM approves or rejects a document.
  review(
    projectId: number,
    documentId: number,
    data: DocumentReview,
  ): Promise<DocumentResponse> {
    return api
      .patch<DocumentResponse>(`/projects/${projectId}/documents/${documentId}/review`, data)
      .then((r) => r.data);
  },
};
