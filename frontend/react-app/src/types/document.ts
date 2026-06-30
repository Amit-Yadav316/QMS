// Project document store.

export type DocumentCategory =
  | 'MIX_DESIGN'
  | 'RMC_DETAIL'
  | 'POUR_RECORD'
  | 'GRADE_DETAIL'
  | 'CUBE_TEST_REGISTER'
  | 'OTHER';

export type DocumentApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DocumentResponse {
  document_id: number;
  project_id: number;
  document_type: DocumentCategory | string | null;
  title: string | null;
  original_filename: string;
  content_type: string | null;
  size_bytes: number;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  approval_status: DocumentApprovalStatus;
  rejection_reason: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  uploaded_at: string;
}

export interface DocumentReview {
  approval_status: DocumentApprovalStatus;
  rejection_reason?: string | null;
}
