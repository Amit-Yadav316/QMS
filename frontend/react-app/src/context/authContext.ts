// The auth context object + its value type live here (no component export)
// so Fast Refresh stays happy. The provider is in AuthContext.tsx and the
// consumer hook is in hooks/useAuth.ts.

import { createContext } from 'react';
import type {
  UserResponse,
  OrgResponse,
  OrgRegisterRequest,
  AcceptInvitationRequest,
  OtpChallengeResponse,
} from '../types/auth';

export interface AuthContextValue {
  user: UserResponse | null;
  organisation: OrgResponse | null;
  isAuthenticated: boolean;
  // True only during the initial "validate stored token" bootstrap.
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  // register/acceptInvitation create an inactive account and return the OTP
  // challenge (they do NOT log the user in — verifyOtp does that).
  register: (data: OrgRegisterRequest) => Promise<OtpChallengeResponse>;
  acceptInvitation: (data: AcceptInvitationRequest) => Promise<OtpChallengeResponse>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
