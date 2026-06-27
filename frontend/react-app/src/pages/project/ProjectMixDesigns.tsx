import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorBox } from '../../components/ui/ErrorBox';
import { useProject } from '../../components/layout/ProjectLayout';
import { getApiErrorMessage } from '../../api/client';
import { toast } from '../../lib/toast';
import { useCreateMixDesign, useMixDesigns } from '../../queries/mixDesigns';
import { useSuppliers } from '../../queries/suppliers';
import { useGrades } from '../../queries/catalog';
import type { MixApprovalStatus, MixDesignCreate } from '../../types/master';

const APPROVAL_VARIANT: Record<MixApprovalStatus, 'pass' | 'fail' | 'warn'> = {
  APPROVED: 'pass', REJECTED: 'fail', IN_PROGRESS: 'warn',
};

const num = (v: string): number | undefined => {
  const t = v.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isNaN(n) ? undefined : n;
};

const EMPTY = { supplier_id: '', grade_id: '', wc_ratio: '', approval_status: 'IN_PROGRESS' as MixApprovalStatus };

export const ProjectMixDesigns: React.FC = () => {
  const { project } = useProject();
  const pid = project.project_id;
  const canManage = project.access.can_manage_contractor_side;

  const { data: rows = [], isPending, error: loadError } = useMixDesigns(pid);
  const { data: suppliers = [] } = useSuppliers(pid);
  const { data: grades = [] } = useGrades();
  const createMixDesign = useCreateMixDesign(pid);

  const [form, setForm] = useState({ ...EMPTY });
  const [showForm, setShowForm] = useState(false);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: MixDesignCreate = {
      supplier_id: Number(form.supplier_id),
      grade_id: Number(form.grade_id),
      wc_ratio: num(form.wc_ratio),
      approval_status: form.approval_status,
    };
    try {
      const md = await createMixDesign.mutateAsync(payload);
      toast.success(`Mix design for ${md.grade_name} (${md.supplier_name}) added.`);
      setForm({ ...EMPTY });
      setShowForm(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to add mix design.'));
    }
  };

  const canAdd = form.supplier_id !== '' && form.grade_id !== '';

  return (
    <div>
      {loadError && <ErrorBox>{getApiErrorMessage(loadError, 'Unable to load mix designs.')}</ErrorBox>}

      {canManage && showForm && (
        <Card className="qms-form-section">
          <h3 className="qms-section-heading-plain qms-mb-12">Add a mix design</h3>
          {suppliers.length === 0 ? (
            <div>
              <p className="text-muted qms-mb-12">
                Register a supplier first — mix designs are tied to a supplier and grade.
              </p>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="qms-grid-2">
              <Select
                label="Supplier" required value={form.supplier_id} onChange={set('supplier_id')}
                options={[{ label: 'Select a supplier…', value: '' },
                  ...suppliers.map((s) => ({ label: s.supplier_name, value: s.supplier_id }))]}
              />
              <Select
                label="Grade" required value={form.grade_id} onChange={set('grade_id')}
                options={[{ label: 'Select a grade…', value: '' },
                  ...grades.map((g) => ({ label: g.grade_name, value: g.grade_id }))]}
              />
              <Input label="W/C ratio" type="number" step="0.01" value={form.wc_ratio} onChange={set('wc_ratio')} placeholder="e.g. 0.42" />
              <Select
                label="Approval status" value={form.approval_status} onChange={set('approval_status')}
                options={[
                  { label: 'In progress', value: 'IN_PROGRESS' },
                  { label: 'Approved', value: 'APPROVED' },
                  { label: 'Rejected', value: 'REJECTED' },
                ]}
              />
              <div className="qms-form-actions qms-grid-span-2">
                <Button type="submit" variant="primary" disabled={createMixDesign.isPending || !canAdd} icon={<Plus size={16} />}>
                  {createMixDesign.isPending ? 'Adding…' : 'Add mix design'}
                </Button>
                <Button type="button" variant="ghost" disabled={createMixDesign.isPending} onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

      <Card className="qms-form-section" padding="none">
        <div className="qms-card-header">
          <h3 className="qms-section-heading-plain">Mix designs</h3>
          {canManage && !showForm && (
            <Button variant="primary" size="sm" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>
              Add mix design
            </Button>
          )}
        </div>
        <div className="qms-table-container">
          <table className="qms-table">
            <thead><tr><th>Grade</th><th>Supplier</th><th>W/C ratio</th><th>28-day (MPa)</th><th>Approval</th></tr></thead>
            <tbody>
              {isPending ? (
                <tr><td colSpan={5} className="text-muted">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="text-muted">No mix designs yet.</td></tr>
              ) : (
                rows.map((m) => (
                  <tr key={m.mix_design_id}>
                    <td className="font-medium">{m.grade_name ?? '—'}</td>
                    <td>{m.supplier_name ?? '—'}</td>
                    <td>{m.wc_ratio != null ? m.wc_ratio : '—'}</td>
                    <td>{m.strength_28day_mpa != null ? m.strength_28day_mpa : '—'}</td>
                    <td>
                      {m.approval_status
                        ? <Badge variant={APPROVAL_VARIANT[m.approval_status]}>{m.approval_status.replace('_', ' ')}</Badge>
                        : '—'}
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
