// Standalone auth page used as the ProtectedRoute redirect target and the
// /login route. Toggles between client login and client self-registration
// (both backed by existing /auth endpoints).

import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage } from '../api/client';
import './LoginPage.css';

type Mode = 'login' | 'register';

export const LoginPage: React.FC = () => {
  const { isAuthenticated, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/app';

  const [mode, setMode] = useState<Mode>('login');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shared fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Register-only fields
  const [orgName, setOrgName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Already signed in → skip the page.
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({
          org_name: orgName,
          contact_email: email,
          contact_phone: phone || null,
          full_name: fullName,
          password,
          confirm_password: confirmPassword,
        });
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to sign in. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const isRegister = mode === 'register';

  return (
    <div className="qms-auth-page">
      <div className="qms-auth-card">
        <div className="qms-auth-brand">
          <div className="qms-auth-mark">QM</div>
          <h1 className="qms-auth-title">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
          <p className="qms-auth-sub">
            {isRegister ? 'Register your company and admin account' : 'Log in to your QMS account'}
          </p>
        </div>

        <form className="qms-auth-form" onSubmit={handleSubmit}>
          {error && <div className="qms-auth-error">{error}</div>}

          {isRegister && (
            <>
              <Input
                label="Company name"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Godrej Properties"
              />
              <Input
                label="Your full name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="As per company ID"
              />
              <Input
                label="Phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
              />
            </>
          )}

          <Input
            label="Email address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@construction.com"
          />
          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {isRegister && (
            <Input
              label="Confirm password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          )}

          <Button type="submit" variant="primary" fullWidth disabled={submitting}>
            {submitting
              ? 'Please wait…'
              : isRegister
                ? 'Create account'
                : 'Sign in to QMS'}
          </Button>
        </form>

        <div className="qms-auth-switch">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode(isRegister ? 'login' : 'register');
            }}
          >
            {isRegister ? 'Log in' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  );
};
