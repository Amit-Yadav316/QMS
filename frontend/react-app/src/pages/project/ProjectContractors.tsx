import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Plus, FlaskConical, Factory, ChevronRight } from 'lucide-react';
import { useProject } from '../../components/layout/ProjectLayout';
import { projectsApi } from '../../api/projects';
import { suppliersApi } from '../../api/suppliers';
import { labsApi } from '../../api/labs';
import { mixDesignsApi } from '../../api/mixDesigns';
import { getApiErrorMessage } from '../../api/client';
import type {
  ConfirmationStatus,
  ContractorLinkStatus,
  LabResponse,
  MixApprovalStatus,
  MixDesignResponse,
  ProjectContractor,
  SupplierResponse,
  TowerResponse,
} from '../../types/master';

const STATUS_BADGE: Record<ContractorLinkStatus, { variant: 'pass' | 'pending' | 'fail'; label: string }> = {
  ACCEPTED: { variant: 'pass', label: 'Accepted' },
  PENDING: { variant: 'pending', label: 'Pending' },
  DECLINED: { variant: 'fail', label: 'Declined' },
};

const CONF_VARIANT: Record<ConfirmationStatus, 'pass' | 'warn' | 'fail'> = {
  CONFIRMED: 'pass', PENDING: 'warn', DECLINED: 'fail',
};
const CONF_LABEL: Record<ConfirmationStatus, string> = {
  CONFIRMED: 'Confirmed', PENDING: 'Pending', DECLINED: 'Declined',
};
const APPROVAL_VARIANT: Record<MixApprovalStatus, 'pass' | 'fail' | 'warn'> = {
  APPROVED: 'pass', REJECTED: 'fail', IN_PROGRESS: 'warn',
};

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: 'var(--gray-600)' }}>
    {icon}
    <span className="qms-text-sm font-medium">{title}</span>
  </div>
);

// A contractor's testing labs — a simple list (labs have no nested data).
const LabList: React.FC<{ labs: LabResponse[] }> = ({ labs }) => (
  <div style={{ flex: 1, minWidth: 240 }}>
    <SectionHeader icon={<FlaskConical size={14} />} title="Testing labs" />
    {labs.length === 0 ? (
      <p className="qms-text-sm text-muted" style={{ margin: 0 }}>None yet.</p>
    ) : (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {labs.map((l) => (
          <li key={l.lab_id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span>{l.lab_name}</span>
            <Badge variant={CONF_VARIANT[l.status]}>{CONF_LABEL[l.status]}</Badge>
          </li>
        ))}
      </ul>
    )}
  </div>
);

// A contractor's RMC suppliers — each expands to reveal its mix designs.
const SupplierList: React.FC<{
  suppliers: SupplierResponse[];
  mixDesigns: MixDesignResponse[];
}> = ({ suppliers, mixDesigns }) => {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div style={{ flex: 1, minWidth: 280 }}>
      <SectionHeader icon={<Factory size={14} />} title="RMC suppliers" />
      {suppliers.length === 0 ? (
        <p className="qms-text-sm text-muted" style={{ margin: 0 }}>None yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {suppliers.map((s) => {
            const mds = mixDesigns.filter((m) => m.supplier_id === s.supplier_id);
            const isOpen = open === s.supplier_id;
            return (
              <div key={s.supplier_id} style={{ border: '1px solid var(--gray-200)', borderRadius: 8, overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : s.supplier_id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer',
                    font: 'inherit', textAlign: 'left',
                  }}
                >
                  <ChevronRight size={14} style={{ flexShrink: 0, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
                  <span className="font-medium" style={{ fontSize: 13 }}>{s.supplier_name}</span>
                  <Badge variant={CONF_VARIANT[s.status]}>{CONF_LABEL[s.status]}</Badge>
                  <span className="qms-text-sm text-muted" style={{ marginLeft: 'auto' }}>
                    {mds.length} mix design{mds.length === 1 ? '' : 's'}
                  </span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 12px 10px 30px' }}>
                    {mds.length === 0 ? (
                      <p className="qms-text-sm text-muted" style={{ margin: 0 }}>No mix designs yet.</p>
                    ) : (
                      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {mds.map((m) => (
                          <li key={m.mix_design_id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                            <span className="font-medium">{m.grade_name ?? '—'}</span>
                            <span className="text-muted">W/C {m.wc_ratio ?? '—'}</span>
                            {m.strength_28day_mpa != null && (
                              <span className="text-muted">{m.strength_28day_mpa} MPa</span>
                            )}
                            {m.approval_status && (
                              <Badge variant={APPROVAL_VARIANT[m.approval_status]}>{m.approval_status.replace('_', ' ')}</Badge>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ProjectContractors: React.FC = () => {
  const { project } = useProject();
  const pid = project.project_id;
  const canManage = project.access.can_manage_client_side;

  const [rows, setRows] = useState<ProjectContractor[]>([]);
  const [towers, setTowers] = useState<TowerResponse[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [labs, setLabs] = useState<LabResponse[]>([]);
  const [mixDesigns, setMixDesigns] = useState<MixDesignResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [towerIds, setTowerIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pcs, tw, sup, lb, md] = await Promise.all([
        projectsApi.contractors(pid),
        projectsApi.towers(pid),
        suppliersApi.list(pid),
        labsApi.list(pid),
        mixDesignsApi.list(pid),
      ]);
      setRows(pcs);
      setTowers(tw);
      setSuppliers(sup);
      setLabs(lb);
      setMixDesigns(md);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load contractors.'));
    } finally {
      setLoading(false);
    }
  }, [pid]);

  useEffect(() => { void load(); }, [load]);

  const toggleTower = (id: number) =>
    setTowerIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));

  // Towers already allotted to another (non-declined) contractor — derived from
  // their readable scope label so the same tower can't be handed out twice.
  const wholeProjectBy =
    rows.find((c) => c.status !== 'DECLINED' && (!c.scope || c.scope === 'Entire project'))
      ?.contractor_org_name ?? null;
  const takenBy: Record<string, string> = {};
  rows.forEach((c) => {
    if (c.status === 'DECLINED' || !c.scope || c.scope === 'Entire project') return;
    c.scope.split(',').forEach((name) => { takenBy[name.trim()] = c.contractor_org_name; });
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null); setSubmitting(true);
    try {
      const pc = await projectsApi.addContractor(pid, {
        org_name: orgName.trim(),
        contact_email: email.trim(),
        contact_phone: phone.trim() || null,
        tower_ids: towerIds,
      });
      setSuccess(`${pc.contractor_org_name} invited — they'll accept the project after activating.`);
      setOrgName(''); setEmail(''); setPhone(''); setTowerIds([]);
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
            <div style={{ gridColumn: 'span 2' }}>
              <label className="qms-input-label" style={{ display: 'block', marginBottom: 6 }}>Towers this contractor works on</label>
              {towers.length === 0 ? (
                <p className="qms-text-sm text-muted" style={{ margin: 0 }}>No towers on this project yet — the contractor will cover the entire project.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {towers.map((t) => {
                    const takenByName = wholeProjectBy ?? takenBy[t.tower_name];
                    const isTaken = !!takenByName;
                    // Taken towers show as a dimmed, ticked chip (allotted elsewhere).
                    const checked = isTaken || towerIds.includes(t.tower_id);
                    return (
                      <label
                        key={t.tower_id}
                        title={isTaken ? `Already assigned to ${takenByName}` : undefined}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                          cursor: isTaken ? 'not-allowed' : 'pointer',
                          padding: '10px 16px', borderRadius: 10, fontSize: 14,
                          opacity: isTaken ? 0.55 : 1,
                          border: `1px solid ${checked ? 'var(--blue-500, #3B82F6)' : 'var(--gray-200)'}`,
                          background: checked ? 'var(--blue-50, #EFF6FF)' : 'var(--gray-50, #F9FAFB)',
                          color: checked ? 'var(--blue-700, #1D4ED8)' : 'var(--gray-700)',
                        }}
                      >
                        <input type="checkbox" checked={checked} disabled={isTaken} onChange={() => toggleTower(t.tower_id)} />
                        {t.tower_name}
                      </label>
                    );
                  })}
                </div>
              )}
              <p className="qms-text-sm text-muted" style={{ marginTop: 6, marginBottom: 0 }}>
                Leave all unchecked for the entire project. Dimmed towers are already assigned to another contractor.
              </p>
            </div>
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
        <div className="qms-p-4" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <p className="text-muted qms-text-sm">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-muted qms-text-sm">No contractors yet.</p>
          ) : (
            rows.map((c) => {
              const theirSuppliers = suppliers.filter((s) => s.contractor_org_id === c.contractor_org_id);
              const theirLabs = labs.filter((l) => l.contractor_org_id === c.contractor_org_id);
              return (
                <Card key={c.pc_id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="font-medium" style={{ fontSize: 15 }}>{c.contractor_org_name}</span>
                        <Badge variant={STATUS_BADGE[c.status].variant}>{STATUS_BADGE[c.status].label}</Badge>
                      </div>
                      <p className="qms-text-sm text-muted" style={{ margin: '4px 0 0' }}>
                        Scope: {c.scope ?? 'Entire project'} · Added {new Date(c.assigned_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 14 }}>
                    <SupplierList suppliers={theirSuppliers} mixDesigns={mixDesigns} />
                    <LabList labs={theirLabs} />
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};
