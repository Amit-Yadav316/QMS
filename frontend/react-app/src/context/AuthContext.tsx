// AuthProvider — holds the current user/org, persists the session to
// localStorage, and exposes login/logout/refreshMe to the tree.

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/auth';
import { tokenStorage } from '../api/tokenStorage';
import { AUTH_LOGOUT_EVENT } from '../api/client';
import type { UserResponse, OrgResponse, OrgRegisterRequest } from '../types/auth';
import { AuthContext } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(() => tokenStorage.getUser());
  const [organisation, setOrganisation] = useState<OrgResponse | null>(null);
  // If a token exists we must validate it before rendering protected routes.
  const [isLoading, setIsLoading] = useState<boolean>(() => !!tokenStorage.getAccess());

  const clearSession = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
    setOrganisation(null);
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await authApi.me();
    setUser(me.user);
    setOrganisation(me.organisation);
    tokenStorage.setUser(me.user);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    tokenStorage.setSession(res.access_token, res.refresh_token, res.user);
    setUser(res.user);
    // Pull org details (login response doesn't include them).
    await refreshMe();
  }, [refreshMe]);

  const register = useCallback(async (data: OrgRegisterRequest) => {
    const res = await authApi.register(data);
    tokenStorage.setSession(res.access_token, res.refresh_token, res.user);
    setUser(res.user);
    await refreshMe();
  }, [refreshMe]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Best-effort — clear locally even if the server call fails.
    }
    clearSession();
  }, [clearSession]);

  // Bootstrap: validate any stored token on first load.
  useEffect(() => {
    if (!tokenStorage.getAccess()) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    refreshMe()
      .catch(() => {
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshMe, clearSession]);

  // Forced logout dispatched by the axios client when refresh fails.
  useEffect(() => {
    const onForcedLogout = () => clearSession();
    window.addEventListener(AUTH_LOGOUT_EVENT, onForcedLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, onForcedLogout);
  }, [clearSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        organisation,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
