// Centralised localStorage access for auth tokens + cached user.
// Single source of truth so AuthContext and the axios client agree on keys.

import type { UserResponse } from '../types/auth';

const ACCESS_KEY = 'qms_access_token';
const REFRESH_KEY = 'qms_refresh_token';
const USER_KEY = 'qms_user';

export const tokenStorage = {
  getAccess(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  getUser(): UserResponse | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserResponse;
    } catch {
      return null;
    }
  },
  setSession(access: string, refresh: string, user: UserResponse): void {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  setAccess(access: string): void {
    localStorage.setItem(ACCESS_KEY, access);
  },
  setUser(user: UserResponse): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
