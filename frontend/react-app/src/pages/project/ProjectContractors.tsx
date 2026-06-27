import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorBox } from '../../components/ui/ErrorBox';
import { Plus, FlaskConical, Factory, ChevronRight, AlertTriangle } from 'lucide-react';
import { useProject } from '../../components/layout/ProjectLayout';
import { getApiErrorMessage } from '../../api/client';
import { toast } from '../../lib/toast';
import { useAddContractor, useAvailableContractors, useProjectContractors } from '../../queries/contractors';
import { useProjectTowers } from '../../queries/floors';
import { useSuppliers } from '../../queries/suppliers';
import { useLabs } from '../../queries/labs';
import type {
  AvailableContractor,
  ContractorLinkStatus,
  ProjectContractorCreate,
} from '../../types/master';
import './ProjectContractors.css';

const STATUS_BADGE: Record<ContractorLinkStatus, { variant: 'pass' | 'pending' | 'fail'; label: string }> = {
  ACCEPTED: { variant: 'pass', label: 'Accepted' },
  PENDING: { variant: 'pending', label: 'Pending' },
  DECLINED: { variant: 'fail', label: 'Declined' },
};

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

const Tally: React.FC<{ icon: React.ReactNode; n: number; noun: string }> = ({ icon, n, noun }) => (
  <span className="qms-tally">
    {icon}
    {n} {noun}{n === 1 ? '' : 's'}
  </span>
);

export const ProjectContractors: React.FC = () => {
  const { project } = useProject();
  const navigate = useNavigate();
  const pid = project.project_id;
  const canManage = project.access.can_manage_client_side;

  const contractorsQuery = useProjectContractors(pid);
  const rows = contractorsQuery.data ?? [];
  const { data: towers = [] } = useProjectTowers(pid);
  const { data: suppliers = [] } = useSuppliers(pid);
  const { data: labs = [] } = useLabs(pid);
  const { data: available = [] } = useAvailableContractors(pid, canManage);
  const addContractor = useAddContractor(pid);

  // Add-contractor form (hidden until "Add contractor" is clicked).
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [towerIds, setTowerIds] = useState<number[]>([]);
  const [confirmTarget, setConfirmTarget] = useState<AvailableContractor | null>(null);
  const submitting = addContractor.isPending;

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

  const resetForm = () => {
    setOrgName(''); setEmail(''); setPhone(''); setSelectedOrgId(''); setTowerIds([]); setMode('new');
  };

  // The single place that calls the API — used by both the new-contractor flow
  // and the "assign anyway" confirmation for an already-engaged contractor.
  const doSubmit = async (payload: ProjectContractorCreate) => {
    try {
      const pc = await addContractor.mutateAsync(payload);
      toast.success(
        payload.contractor_org_id
          ? `${pc.contractor_org_name} assigned — they'll accept the project from their dashboard.`
          : `${pc.contractor_org_name} invited — they'll accept the project after activating.`,
      );
      resetForm();
      setShowForm(false);
      setConfirmTarget(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to add contractor.'));
      setConfirmTarget(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'existing') {
      const chosen = available.find((a) => a.contractor_org_id === Number(selectedOrgId));
      if (!chosen) { toast.error('Pick a contractor from the list.'); return; }
      // Busy elsewhere → confirm first; otherwise assign straight away.
      if (chosen.engagements.length > 0) { setConfirmTarget(chosen); return; }
      void doSubmit({ contractor_org_id: chosen.contractor_org_id, tower_ids: towerIds });
    } else {
      void doSubmit({
        org_name: orgName.trim(),
        contact_email: email.trim(),
        contact_phone: phone.trim() || null,
        tower_ids: towerIds,
      });
    }
  };

  return (
    <div>
      {contractorsQuery.error && <ErrorBox>{getApiErrorMessage(contractorsQuery.error, 'Unable to load contractors.')}</ErrorBox>}

      {canManage && showForm && (
        <Card className="qms-form-section">
          <h3 className="qms-section-heading-plain qms-mb-12">Bring a contractor onto this project</h3>

          {available.length > 0 && (
            <div className="qms-modeswitch">
              {(['new', 'existing'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`qms-modeswitch-btn ${mode === m ? 'qms-modeswitch-btn--active' : ''}`}
                >
                  {m === 'new' ? 'New contractor' : 'Existing contractor'}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="qms-grid-2">
            {mode === 'existing' ? (
              <div className="qms-grid-span-2">
                <Select
                  label="Contractor"
                  required
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  options={[
                    { label: 'Select a contractor you already work with…', value: '' },
                    ...available.map((a) => ({
                      label: a.engagements.length ? `${a.org_name} · busy on ${a.engagements.length} project${a.engagements.length === 1 ? '' : 's'}` : a.org_name,
                      value: String(a.contractor_org_id),
                    })),
                  ]}
                />
                <p className="qms-text-sm text-muted qms-mt-8">
                  Re-uses the same contractor company. Their team for this project is assigned separately.
                </p>
              </div>
            ) : (
              <>
                <Input label="Contractor company name" required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. L&T Construction" />
                <Input label="Contractor admin email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@contractor.com" />
                <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
                {available.length > 0 && (
                  <p className="qms-text-sm text-muted qms-grid-span-2">
                    Already worked with this contractor? Switch to <strong>Existing contractor</strong> instead of re-inviting them.
                  </p>
                )}
              </>
            )}

            <div className="qms-grid-span-2">
              <label className="qms-input-label qms-mb-12">Towers this contractor works on</label>
              {towers.length === 0 ? (
                <p className="qms-text-sm text-muted qms-detail-msg">No towers on this project yet — the contractor will cover the entire project.</p>
              ) : (
                <div className="qms-tower-picker">
                  {towers.map((t) => {
                    const takenByName = wholeProjectBy ?? takenBy[t.tower_name];
                    const isTaken = !!takenByName;
                    // Taken towers show as a dimmed, ticked chip (allotted elsewhere).
                    const checked = isTaken || towerIds.includes(t.tower_id);
                    return (
                      <label
                        key={t.tower_id}
                        title={isTaken ? `Already assigned to ${takenByName}` : undefined}
                        className={`qms-tower-chip ${checked ? 'qms-tower-chip--checked' : ''} ${isTaken ? 'qms-tower-chip--taken' : ''}`}
                      >
                        <input type="checkbox" checked={checked} disabled={isTaken} onChange={() => toggleTower(t.tower_id)} />
                        {t.tower_name}
                      </label>
                    );
                  })}
                </div>
              )}
              <p className="qms-text-sm text-muted qms-mt-8">
                Leave all unchecked for the entire project. Dimmed towers are already assigned to another contractor.
              </p>
            </div>

            <div className="qms-form-actions qms-grid-span-2">
              <Button type="submit" variant="primary" disabled={submitting} icon={<Plus size={16} />}>
                {submitting ? 'Sending…' : mode === 'existing' ? 'Assign contractor' : 'Add contractor'}
              </Button>
              <Button type="button" variant="ghost" disabled={submitting} onClick={() => { setShowForm(false); resetForm(); }}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="qms-form-section" padding="none">
        <div className="qms-card-header">
          <h3 className="qms-section-heading-plain">Contractors on this project</h3>
          {canManage && !showForm && (
            <Button variant="primary" size="sm" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>
              Add contractor
            </Button>
          )}
        </div>
        <div className="qms-p-4 qms-contractor-list">
          {contractorsQuery.isPending ? (
            <p className="text-muted qms-text-sm">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-muted qms-text-sm">No contractors yet.</p>
          ) : (
            rows.map((c) => {
              const supCount = suppliers.filter((s) => s.contractor_org_id === c.contractor_org_id).length;
              const labCount = labs.filter((l) => l.contractor_org_id === c.contractor_org_id).length;
              return (
                <Card
                  key={c.pc_id}
                  className="qms-contractor-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/app/projects/${pid}/contractors/${c.contractor_org_id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/app/projects/${pid}/contractors/${c.contractor_org_id}`); } }}
                >
                  <div className="qms-contractor-card-head">
                    <div>
                      <div className="qms-detail-group-head">
                        <span className="font-medium qms-contractor-name">{c.contractor_org_name}</span>
                        <Badge variant={STATUS_BADGE[c.status].variant}>{STATUS_BADGE[c.status].label}</Badge>
                      </div>
                      <p className="qms-text-sm text-muted qms-detail-msg">
                        Scope: {c.scope ?? 'Entire project'} · Added {new Date(c.assigned_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-muted" />
                  </div>
                  <div className="qms-contractor-tallies">
                    <Tally icon={<Factory size={14} />} n={supCount} noun="RMC supplier" />
                    <Tally icon={<FlaskConical size={14} />} n={labCount} noun="testing lab" />
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </Card>

      {confirmTarget && (
        <div
          role="presentation"
          className="qms-modal-overlay"
          onClick={() => !submitting && setConfirmTarget(null)}
        >
          <Card className="qms-modal-card" role="dialog" aria-modal="true" aria-label="Contractor already engaged" onClick={(e) => e.stopPropagation()}>
            <div className="qms-modal-head">
              <span className="text-warning qms-modal-icon"><AlertTriangle size={20} /></span>
              <h3 className="qms-section-heading-plain qms-detail-msg">Contractor already engaged</h3>
            </div>
            <p className="qms-text-sm qms-detail-msg">
              <strong>{confirmTarget.org_name}</strong> is currently engaged on:
            </p>
            <ul className="qms-modal-engagements">
              {confirmTarget.engagements.map((eng) => (
                <li key={eng.project_id} className="qms-modal-engagement">
                  <div className="qms-detail-group-head qms-detail-msg">
                    <span className="font-medium qms-text-sm">{eng.project_name}</span>
                    <Badge variant={STATUS_BADGE[eng.status].variant}>{STATUS_BADGE[eng.status].label}</Badge>
                  </div>
                  <div className="qms-text-sm text-muted">
                    {fmtDate(eng.start_date)} → {fmtDate(eng.end_date)}
                  </div>
                </li>
              ))}
            </ul>
            <p className="qms-text-sm text-muted qms-detail-msg">
              You can still assign them. Note their contractor users (project managers, quality engineers,
              supervisors) on this project must be different from those on their other projects.
            </p>
            <div className="qms-modal-actions">
              <Button variant="ghost" disabled={submitting} onClick={() => setConfirmTarget(null)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={submitting}
                onClick={() => void doSubmit({ contractor_org_id: confirmTarget.contractor_org_id, tower_ids: towerIds })}
              >
                {submitting ? 'Assigning…' : 'Assign anyway'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
