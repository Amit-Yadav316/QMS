// Shared supplier/lab confirmation handshake primitives (public, token-based).

// PENDING until the supplier/lab confirms (or declines) via the email link.
export type ConfirmationStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED';

export interface ConfirmationResult {
  status: ConfirmationStatus;
  message: string;
}
