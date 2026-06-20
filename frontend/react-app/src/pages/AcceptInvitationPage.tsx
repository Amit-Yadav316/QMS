// Landing target for invitation emails:
//   {FRONTEND_URL}/auth/accept-invitation?token=<token>
// The invited user (contractor admin / PM / QE / supervisor) sets their name +
// password to activate their account, then lands in the app — see
// backend POST /auth/accept-invitation.

import React, { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage } from '../api/client';
import './LoginPage.css';

export const AcceptInvitationPage: React.FC = () => {
  const { isAuthenticated, acceptInvitation } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in → no point accepting again.
  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('This link is missing its invitation token. Please use the link from your email.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await acceptInvitation({
        token,
        full_name: fullName,
        password,
        confirm_password: confirmPassword,
      });
      navigate('/app', { replace: true });
    } catch (err) {
      setError(
        getApiErrorMessage(err, 'Could not accept the invitation. The link may have expired.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="qms-auth-page">
      <div className="qms-auth-card">
        <div className="qms-auth-brand">
          <div className="qms-auth-mark">QM</div>
          <h1 className="qms-auth-title">Accept your invitation</h1>
          <p className="qms-auth-sub">Set your name and password to activate your account</p>
        </div>

        <form className="qms-auth-form" onSubmit={handleSubmit}>
          {error && <div className="qms-auth-error">{error}</div>}

          {!token && (
            <div className="qms-auth-error">
              No invitation token found in the URL.
            </div>
          )}

          <Input
            label="Your full name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="As per company ID"
          />
          <Input
            label="Password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          <Input
            label="Confirm password"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />

          <Button type="submit" variant="primary" fullWidth disabled={submitting || !token}>
            {submitting ? 'Activating…' : 'Activate account'}
          </Button>
        </form>

        <div className="qms-auth-switch">
          Already activated?
          <button type="button" onClick={() => navigate('/login')}>Log in</button>
        </div>
      </div>
    </div>
  );
};
