import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Check, X } from 'lucide-react';
import { projectsApi } from '../api/projects';
import { getApiErrorMessage } from '../api/client';
import type { AssignedProject, ContractorLinkStatus } from '../types/master';
import './ProjectMasterForm.css';

const STATUS_BADGE: Record<ContractorLinkStatus, { variant: 'pass' | 'pending' | 'fail'; label: string }> = {
  ACCEPTED: { variant: 'pass', label: 'Accepted' },
  PENDING: { variant: 'pending', label: 'Pending' },
  DECLINED: { variant: 'fail', label: 'Declined' },
};

export const AssignedProjects: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AssignedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await projectsApi.assigned());
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load assigned projects.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const respond = async (pcId: number, accept: boolean) => {
    setBusy(pcId); setError(null);
    try {
      if (accept) await projectsApi.acceptAssigned(pcId);
      else await projectsApi.declineAssigned(pcId);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Action failed.'));
    } finally {
      setBusy(null);
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

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14, background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }}>{error}</div>
      )}

      <Card className="qms-form-section" padding="none">
        <div className="qms-table-container">
          <table className="qms-table">
            <thead>
              <tr><th>Project</th><th>Location</th><th>Scope</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-muted">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="text-muted">No project assignments yet.</td></tr>
              ) : (
                rows.map((p) => (
                  <tr key={p.pc_id}>
                    <td className="font-medium">
                      {p.status === 'ACCEPTED' ? (
                        <button className="qms-pw-back" style={{ margin: 0 }} onClick={() => navigate(`/app/projects/${p.project_id}`)}>
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
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button type="button" variant="success" disabled={busy === p.pc_id} icon={<Check size={16} />} onClick={() => respond(p.pc_id, true)}>Accept</Button>
                          <Button type="button" variant="outline" disabled={busy === p.pc_id} icon={<X size={16} />} onClick={() => respond(p.pc_id, false)}>Decline</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
