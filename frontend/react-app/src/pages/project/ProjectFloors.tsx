// Floors setup — floors belong to a tower, so you pick a tower and bulk-generate
// its floors. A tower can hold at most the floor count entered for it during
// project setup (TowerResponse.floors_total). Pour cards need floors to exist
// here before a floor can be selected.

import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { ErrorBox } from '../../components/ui/ErrorBox';
import { useProject } from '../../components/layout/ProjectLayout';
import { getApiErrorMessage } from '../../api/client';
import { toast } from '../../lib/toast';
import { useFloors, useGenerateFloors, useProjectTowers } from '../../queries/floors';
import './ProjectFloors.css';

export const ProjectFloors: React.FC = () => {
  const { project } = useProject();
  const pid = project.project_id;
  const canManage =
    project.access.can_manage_client_side || project.access.can_manage_contractor_side;

  const towersQuery = useProjectTowers(pid);
  const towers = useMemo(() => towersQuery.data ?? [], [towersQuery.data]);

  const [towerId, setTowerId] = useState('');
  const [prefix, setPrefix] = useState('L');
  const [count, setCount] = useState('');
  const [showForm, setShowForm] = useState(false);

  const floorsQuery = useFloors(pid, towerId ? Number(towerId) : null);
  const floors = useMemo(() => floorsQuery.data ?? [], [floorsQuery.data]);
  const generate = useGenerateFloors(pid);

  const loadError = towersQuery.error ?? floorsQuery.error;

  // Contractor-side managers only set up floors for their allotted towers.
  const visibleTowers = useMemo(() => {
    const scope = project.assigned_scope;
    if (!scope || scope === 'Entire project') return towers;
    const allowed = new Set(scope.split(',').map((s) => s.trim()));
    return towers.filter((t) => allowed.has(t.tower_name));
  }, [towers, project.assigned_scope]);

  const tower = useMemo(
    () => towers.find((t) => t.tower_id === Number(towerId)) ?? null,
    [towers, towerId],
  );
  const cap = tower?.floors_total ?? null;
  const remaining = cap != null ? Math.max(0, cap - floors.length) : null;
  const atCapacity = remaining === 0;

  // Default to the first tower the viewer can actually see.
  useEffect(() => {
    if (!towerId && visibleTowers.length) setTowerId(String(visibleTowers[0].tower_id));
  }, [visibleTowers, towerId]);

  // Default the count to "fill up to the cap" whenever the tower/floors change.
  useEffect(() => {
    if (cap != null) setCount(String(Math.max(0, cap - floors.length)));
  }, [cap, floors.length]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!towerId) return;
    const n = Number(count);
    if (!Number.isInteger(n) || n <= 0) { toast.error('Enter how many floors to add.'); return; }
    if (remaining != null && n > remaining) {
      toast.error(`This tower allows ${cap} floors — only ${remaining} more can be added.`);
      return;
    }
    // Continue numbering after the highest existing floor so labels don't clash.
    const start = floors.length
      ? Math.max(...floors.map((f) => f.floor_number ?? 0)) + 1
      : 1;
    try {
      const created = await generate.mutateAsync({
        towerId: Number(towerId),
        data: { count: n, start_number: start, label_prefix: prefix.trim() || 'L' },
      });
      toast.success(`Added ${created.length} floor${created.length === 1 ? '' : 's'} to ${tower?.tower_name ?? 'the tower'}.`);
      setShowForm(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to add floors.'));
    }
  };

  return (
    <div>
      {loadError && <ErrorBox>{getApiErrorMessage(loadError, 'Unable to load towers or floors.')}</ErrorBox>}

      {towersQuery.isPending ? (
        <p className="text-muted qms-text-sm">Loading towers…</p>
      ) : visibleTowers.length === 0 ? (
        <Card className="qms-form-section">
          <p className="text-muted qms-floors-msg">
            {towers.length === 0
              ? 'This project has no towers. Add towers in project setup first, then come back to add their floors.'
              : 'You have no towers assigned on this project yet.'}
          </p>
        </Card>
      ) : (
        <>
          <Card className="qms-form-section">
            <div className="qms-row-between qms-mb-12">
              <h3 className="qms-section-heading-plain">Tower floors</h3>
              {canManage && !showForm && (
                <Button variant="primary" size="sm" icon={<Plus size={15} />} disabled={atCapacity} onClick={() => setShowForm(true)}>
                  Add floors
                </Button>
              )}
            </div>
            <div className="qms-grid-2">
              <Select
                label="Tower"
                value={towerId}
                onChange={(e) => { setTowerId(e.target.value); setShowForm(false); }}
                options={visibleTowers.map((t) => ({
                  label: t.floors_total != null ? `${t.tower_name} (max ${t.floors_total} floors)` : t.tower_name,
                  value: t.tower_id,
                }))}
              />
              <div className="qms-field-end">
                <p className="qms-text-sm text-muted">
                  {floors.length} floor{floors.length === 1 ? '' : 's'} created
                  {cap != null ? ` of ${cap} allowed` : ''}
                  {remaining != null && remaining > 0 ? ` · ${remaining} more can be added` : ''}
                </p>
              </div>
            </div>

            {canManage && atCapacity && !showForm && (
              <p className="qms-text-sm text-muted qms-floors-cap-note">
                All {cap} floors for this tower have been created.
              </p>
            )}

            {canManage && showForm && (
              <form onSubmit={handleGenerate} className="qms-grid-2 qms-floors-form">
                <Input
                  label="Floor label prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="e.g. L → L1, L2, L3"
                />
                <Input
                  label="How many floors to add"
                  type="number"
                  min={1}
                  max={remaining ?? undefined}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  disabled={atCapacity}
                />
                <div className="qms-form-actions qms-grid-span-2">
                  <Button type="submit" variant="primary" disabled={generate.isPending || atCapacity} icon={<Plus size={16} />}>
                    {generate.isPending ? 'Adding…' : 'Generate floors'}
                  </Button>
                  <Button type="button" variant="ghost" disabled={generate.isPending} onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </Card>

          <Card className="qms-form-section" padding="none">
            <div className="qms-p-4 qms-border-b">
              <h3 className="qms-section-heading-plain">Floors in {tower?.tower_name ?? 'this tower'}</h3>
            </div>
            <div className="qms-p-4">
              {floorsQuery.isPending ? (
                <p className="text-muted qms-floors-msg">Loading…</p>
              ) : floors.length === 0 ? (
                <p className="text-muted qms-floors-msg">No floors yet — use “Add floors” above.</p>
              ) : (
                <div className="qms-chip-row">
                  {floors.map((f) => (
                    <span key={f.floor_id} className="qms-chip">{f.floor_label}</span>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
