import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Building2, RefreshCw } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ErrorBox } from '../components/ui/ErrorBox';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage } from '../api/client';
import { toast } from '../lib/toast';
import { useProjects } from '../queries/projects';
import type { ProjectStatus } from '../types/master';
import './ProjectMasterForm.css';

const STATUS_VARIANT: Record<ProjectStatus, 'pass' | 'warn' | 'info'> = {
  ACTIVE: 'pass',
  ON_HOLD: 'warn',
  COMPLETED: 'info',
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  COMPLETED: 'Completed',
};

const TYPE_LABEL: Record<string, string> = {
  RESIDENTIAL: 'Residential',
  COMMERCIAL: 'Commercial',
  MIXED_USE: 'Mixed-Use',
  INFRASTRUCTURE: 'Infrastructure',
};

const fmtDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString() : '—';

export const ProjectsList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const createdName = (location.state as { created?: string } | null)?.created ?? null;
  const { user } = useAuth();
  const canCreate = user?.role === 'CLIENT_ADMIN';

  const { data: projects = [], isPending, isFetching, error, refetch } = useProjects();

  // Surface the "project created" hand-off (set by ProjectMasterForm on navigate).
  useEffect(() => {
    if (createdName) toast.success(`Project "${createdName}" created successfully.`);
  }, [createdName]);

  return (
    <div className="qms-form-page">
      <div className="qms-page-header-block">
        <div>
          <h1 className="qms-page-title-main">Projects</h1>
          <p className="qms-page-subtitle">All projects registered under your organisation</p>
        </div>
        <div className="qms-page-actions">
          <Button type="button" variant="outline" icon={<RefreshCw size={16} />} onClick={() => refetch()} disabled={isFetching}>
            Refresh
          </Button>
          {canCreate && (
            <Button type="button" variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/app/projects/new')}>
              New Project
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorBox>{getApiErrorMessage(error, 'Unable to load projects.')}</ErrorBox>}

      {isPending ? (
        <Card className="qms-form-section"><p className="text-muted qms-text-sm">Loading projects…</p></Card>
      ) : projects.length === 0 && !error ? (
        <Card className="qms-form-section">
          <div className="qms-empty-state">
            <Building2 size={40} className="text-muted qms-empty-icon" />
            <h3 className="qms-section-heading-plain qms-mb-12">No projects yet</h3>
            <p className="text-muted qms-mb-12">
              {canCreate
                ? 'Create your first project to start setting up towers, suppliers and quality parameters.'
                : 'Projects you are assigned to will appear here.'}
            </p>
            {canCreate && (
              <Button type="button" variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/app/projects/new')}>
                New Project
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card className="qms-form-section" padding="none">
          <div className="qms-table-container">
            <table className="qms-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Towers</th>
                  <th>Start</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.project_id}>
                    <td className="font-medium">
                      <button type="button" className="qms-linklike font-medium" onClick={() => navigate(`/app/projects/${p.project_id}`)}>
                        {p.project_name}
                      </button>
                      {p.project_code && <div className="qms-text-sm text-muted">{p.project_code}</div>}
                    </td>
                    <td>{p.project_type ? TYPE_LABEL[p.project_type] ?? p.project_type : '—'}</td>
                    <td><Badge variant={STATUS_VARIANT[p.status] ?? 'default'}>{STATUS_LABEL[p.status] ?? p.status}</Badge></td>
                    <td>{[p.city, p.state].filter(Boolean).join(', ') || '—'}</td>
                    <td>{p.assigned_scope ?? (p.no_of_towers ?? '—')}</td>
                    <td>{fmtDate(p.start_date)}</td>
                    <td>{fmtDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
