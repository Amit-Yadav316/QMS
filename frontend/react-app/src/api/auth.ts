// Auth API — thin typed wrappers over the backend /auth/* endpoints.
// See backend/app/routers/auth.py.

import { api } from './client';
import type {
  LoginRequest,
  OrgRegisterRequest,
  AcceptInvitationRequest,
  TokenResponse,
  MeResponse,
} from '../types/auth';

export const authApi = {
  login(data: LoginRequest): Promise<TokenResponse> {
    return api.post<TokenResponse>('/auth/login', data).then((r) => r.data);
  },

  register(data: OrgRegisterRequest): Promise<TokenResponse> {
    return api.post<TokenResponse>('/auth/register', data).then((r) => r.data);
  },

  acceptInvitation(data: AcceptInvitationRequest): Promise<TokenResponse> {
    return api.post<TokenResponse>('/auth/accept-invitation', data).then((r) => r.data);
  },

  me(): Promise<MeResponse> {
    return api.get<MeResponse>('/auth/me').then((r) => r.data);
  },

  logout(): Promise<void> {
    return api.post('/auth/logout').then(() => undefined);
  },
};
