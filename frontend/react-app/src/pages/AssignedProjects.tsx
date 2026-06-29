import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ErrorBox } from '../components/ui/ErrorBox';
import { Check, X } from 'lucide-react';
import { getApiErrorMessage } from '../api/client';
import { toast } from '../lib/toast';
import { useAssignedProjects, useRespondToAssignment } from '../queries/projects';
import type { ContractorLinkStatus } from '../types/master';
import './ProjectMasterForm.css';

const STATUS_BADGE: Record<ContractorLinkStatus, { variant: 'pass' | 'pending' | 'fail'; label: string }> = {
  ACCEPTED: { variant: 'pass', label: 'Accepted' },
  PENDING: { variant: 'pending', label: 'Pending' },
  DECLINED: { variant: 'fail', label: 'Declined' },
};

export const AssignedProjects: React.FC = () => {
  const navigate = useNavigate();
  const { data: rows = [], isPending, error } = useAssignedProjects();
  const respond = useRespondToAssignment();

  const handleRespond = async (pcId: number, accept: boolean) => {
    try {
      await respond.mutateAsync({ pcId, accept });
      toast.success(accept ? 'Project accepted.' : 'Project declined.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Action failed.'));
    }
  };

  return (
    <div className="qms-form-page">
      <div className="qms-page-header-block">
        <div>
          <h1 className="qms-page-title-main">Assigned Projects</h1>
          <p className="qms-page-subtitle">Projects your organisation has been invited to. Accept one to start working on it.</p>
        </div>
      </div>

      {error && <ErrorBox>{getApiErrorMessage(error, 'Unable to load assigned projects.')}</ErrorBox>}

      <Card className="qms-form-section" padding="none">
        <div className="qms-table-container">
          <table className="qms-table">
            <thead>
              <tr><th>Project</th><th>Location</th><th>Scope</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {isPending ? (
                <tr><td colSpan={5} className="text-muted">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="text-muted">No project assignments yet.</td></tr>
              ) : (
                rows.map((p) => {
                  const busy = respond.isPending && respond.variables?.pcId === p.pc_id;
                  return (
                    <tr key={p.pc_id}>
                      <td className="font-medium">
                        {p.status === 'ACCEPTED' ? (
                          <button type="button" className="qms-linklike font-medium" onClick={() => navigate(`/app/projects/${p.project_id}`)}>
                            {p.project_name}
                          </button>
                        ) : p.project_name}
                        {p.project_code && <div className="qms-text-sm text-muted">{p.project_code}</div>}
                      </td>
                      <td>{[p.city, p.state].filter(Boolean).join(', ') || '—'}</td>
                      <td>{p.scope ?? '—'}</td>
                      <td><Badge variant={STATUS_BADGE[p.status].variant}>{STATUS_BADGE[p.status].label}</Badge></td>
                      <td>
                        {p.status === 'PENDING' && (
                          <div className="qms-cell-actions">
                            <Button type="button" variant="success" disabled={busy} icon={<Check size={16} />} onClick={() => handleRespond(p.pc_id, true)}>Accept</Button>
                            <Button type="button" variant="outline" disabled={busy} icon={<X size={16} />} onClick={() => handleRespond(p.pc_id, false)}>Decline</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
