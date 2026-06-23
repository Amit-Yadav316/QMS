import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Plus } from 'lucide-react';
import { useProject } from '../../components/layout/ProjectLayout';
import { projectsApi } from '../../api/projects';
import { getApiErrorMessage } from '../../api/client';
import type { ContractorLinkStatus, ProjectContractor } from '../../types/master';

const STATUS_BADGE: Record<ContractorLinkStatus, { variant: 'pass' | 'pending' | 'fail'; label: string }> = {
  ACCEPTED: { variant: 'pass', label: 'Accepted' },
  PENDING: { variant: 'pending', label: 'Pending' },
  DECLINED: { variant: 'fail', label: 'Declined' },
};

export const ProjectContractors: React.FC = () => {
  const { project } = useProject();
  const pid = project.project_id;
  const canManage = project.access.can_manage_client_side;

  const [rows, setRows] = useState<ProjectContractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [scope, setScope] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await projectsApi.contractors(pid));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load contractors.'));
    } finally {
      setLoading(false);
    }
  }, [pid]);

  useEffect(() => { void load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null); setSubmitting(true);
    try {
      const pc = await projectsApi.addContractor(pid, {
        org_name: orgName.trim(),
        contact_email: email.trim(),
        contact_phone: phone.trim() || null,
        scope: scope.trim() || null,
      });
      setSuccess(`${pc.contractor_org_name} invited — they'll accept the project after activating.`);
      setOrgName(''); setEmail(''); setPhone(''); setScope('');
      void load();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to add contractor.'));
    } finally {
      setSubmitting(false);
    }
  };

  const alert: React.CSSProperties = { padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 };

  return (
    <div>
      {error && <div style={{ ...alert, background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }}>{error}</div>}
      {success && <div style={{ ...alert, background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }}>{success}</div>}

      {canManage && (
        <Card className="qms-form-section">
          <h3 className="qms-section-heading-plain" style={{ marginBottom: 12 }}>Bring a contractor onto this project</h3>
          <form onSubmit={handleSubmit} className="qms-grid-2">
            <Input label="Contractor company name" required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. L&T Construction" />
            <Input label="Contractor admin email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@contractor.com" />
            <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
            <Input label="Scope" value={scope} onChange={(e) => setScope(e.target.value)} placeholder="e.g. Phase I / Towers 1-3" />
            <div style={{ gridColumn: 'span 2' }}>
              <Button type="submit" variant="primary" disabled={submitting} icon={<Plus size={16} />}>
                {submitting ? 'Sending…' : 'Add contractor'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="qms-form-section" padding="none">
        <div className="qms-p-4 qms-border-b">
          <h3 className="qms-section-heading-plain">Contractors on this project</h3>
        </div>
        <div className="qms-table-container">
          <table className="qms-table">
            <thead>
              <tr><th>Contractor</th><th>Scope</th><th>Status</th><th>Added</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-muted">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="text-muted">No contractors yet.</td></tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.pc_id}>
                    <td className="font-medium">{c.contractor_org_name}</td>
                    <td>{c.scope ?? '—'}</td>
                    <td><Badge variant={STATUS_BADGE[c.status].variant}>{STATUS_BADGE[c.status].label}</Badge></td>
                    <td>{new Date(c.assigned_at).toLocaleDateString()}</td>
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
