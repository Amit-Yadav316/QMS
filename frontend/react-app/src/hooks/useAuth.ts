import { useContext } from 'react';
import { AuthContext } from '../context/authContext';
import type { AuthContextValue } from '../context/authContext';

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}
