// Smart landing for /app:
//   - org admins (many projects) → the project picker
//   - single-project users (client_user / contractor_user) → straight into
//     their one project's workspace
//   - users with no project yet → a short "nothing assigned" message

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
import { projectsApi } from '../api/projects';

export const AppHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [empty, setEmpty] = useState(false);

  const isAdmin = user?.role === 'CLIENT_ADMIN' || user?.role === 'CONTRACTOR_ADMIN';

  useEffect(() => {
    let cancelled = false;
    if (isAdmin) {
      navigate('/app/projects', { replace: true });
      return;
    }
    (async () => {
      try {
        const projects = await projectsApi.list();
        if (cancelled) return;
        if (projects.length === 1) {
          navigate(`/app/projects/${projects[0].project_id}`, { replace: true });
        } else if (projects.length > 1) {
          navigate('/app/projects', { replace: true });
        } else {
          setEmpty(true);
        }
      } catch {
        if (!cancelled) navigate('/app/projects', { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin, navigate]);

  if (empty) {
    return (
      <div className="qms-form-page">
        <Card className="qms-form-section">
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <Building2 size={40} className="text-muted" style={{ marginBottom: 12 }} />
            <h3 className="qms-section-heading-plain" style={{ marginBottom: 6 }}>No project yet</h3>
            <p className="text-muted" style={{ fontSize: 14 }}>
              You haven't been assigned to a project yet. Your admin will add you to one —
              it'll show up here automatically.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return <div className="qms-form-page"><p className="text-muted">Loading your workspace…</p></div>;
};
