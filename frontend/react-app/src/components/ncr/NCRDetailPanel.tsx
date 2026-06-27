import React, { useEffect, useState } from 'react';
import { Gavel, Plus } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { getApiErrorMessage } from '../../api/client';
import type { ActionStatus, NCRStatus, PenaltyType } from '../../types/master';
import { AISuggestionSection } from './AISuggestionSection';
import {
  ACTION_BADGE,
  ACTION_STATUS_OPTIONS,
  fmtDate,
  PENALTY_LABEL,
  PENALTY_OPTIONS,
  STATUS_BADGE,
} from './ncrFormat';
import { ErrorBox } from '../ui/ErrorBox';
import {
  useAddCorrectiveAction,
  useAddPenalty,
  useNcrDetail,
  useUpdateCorrectiveAction,
  useUpdateNcr,
} from './queries';

interface PanelProps {
  pid: number;
  ncrId: number;
  isQE: boolean;
}

export const NCRDetailPanel: React.FC<PanelProps> = ({ pid, ncrId, isQE }) => {
  const { data: ncr, isPending, error: loadError } = useNcrDetail(pid, ncrId);

  const updateNcr = useUpdateNcr(pid, ncrId);
  const addAction = useAddCorrectiveAction(pid, ncrId);
  const updateAction = useUpdateCorrectiveAction(pid, ncrId);
  const addPenalty = useAddPenalty(pid, ncrId);
  const busy = updateNcr.isPending || addAction.isPending || updateAction.isPending || addPenalty.isPending;

  const [actionError, setActionError] = useState<string | null>(null);
  const [rootCause, setRootCause] = useState('');
  const [actionDesc, setActionDesc] = useState('');
  const [actionDue, setActionDue] = useState('');
  const [penaltyType, setPenaltyType] = useState<PenaltyType>('RATE_REDUCTION');
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [penaltyDesc, setPenaltyDesc] = useState('');

  // Seed the editable root-cause field from server data (and re-sync when it
  // changes server-side, e.g. after applying an AI suggestion).
  useEffect(() => {
    if (ncr) setRootCause(ncr.root_cause ?? '');
  }, [ncr?.root_cause]); // eslint-disable-line react-hooks/exhaustive-deps

  // Await a mutation; surface a single error and clear it on the next attempt.
  const run = async (p: Promise<unknown>, fail = 'Action failed.') => {
    setActionError(null);
    try {
      await p;
    } catch (err) {
      setActionError(getApiErrorMessage(err, fail));
    }
  };

  if (isPending) return <p className="text-muted qms-ncr-detail-msg">Loading…</p>;
  if (!ncr) return <p className="text-danger qms-ncr-detail-msg">{loadError ? getApiErrorMessage(loadError, 'Unable to load NCR.') : 'Not found.'}</p>;

  const isClosed = ncr.status === 'CLOSED';
  const rootCauseId = `ncr-rootcause-${ncrId}`;

  const saveRootCause = () => run(updateNcr.mutateAsync({ root_cause: rootCause.trim() || null }));
  const setStatus = (status: NCRStatus) => run(updateNcr.mutateAsync({ status }));
  const addActionSubmit = () => run(
    addAction.mutateAsync({ action_description: actionDesc.trim(), due_date: actionDue || null })
      .then(() => { setActionDesc(''); setActionDue(''); }),
  );
  const setActionStatus = (actionId: number, status: ActionStatus) =>
    run(updateAction.mutateAsync({ actionId, data: { status } }));
  const addPenaltySubmit = () => run(
    addPenalty.mutateAsync({
      penalty_type: penaltyType,
      amount: penaltyAmount ? Number(penaltyAmount) : null,
      description: penaltyDesc.trim() || null,
    }).then(() => { setPenaltyAmount(''); setPenaltyDesc(''); }),
  );

  return (
    <div className="qms-ncr-detail">
      {actionError && <ErrorBox>{actionError}</ErrorBox>}

      {/* Status + transitions */}
      <div className="qms-ncr-detail-statusbar">
        <Badge variant={STATUS_BADGE[ncr.status].variant} icon={STATUS_BADGE[ncr.status].icon}>
          {STATUS_BADGE[ncr.status].label}
        </Badge>
        {ncr.raised_by_name && <span className="qms-text-sm text-muted">Raised by {ncr.raised_by_name}</span>}
        {ncr.closed_at && <span className="qms-text-sm text-muted">Closed {fmtDate(ncr.closed_at)}</span>}
        {isQE && (
          <div className="qms-ncr-detail-transitions">
            {ncr.status === 'OPEN' && (
              <Button size="sm" variant="primary" disabled={busy} onClick={() => setStatus('UNDER_REVIEW')}>Start review</Button>
            )}
            {ncr.status === 'UNDER_REVIEW' && (
              <>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus('OPEN')}>Back to open</Button>
                <Button size="sm" variant="primary" disabled={busy} onClick={() => setStatus('CLOSED')}>Close NCR</Button>
              </>
            )}
            {ncr.status === 'CLOSED' && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus('UNDER_REVIEW')}>Reopen</Button>
            )}
          </div>
        )}
      </div>

      {/* AI suggestion (Phase 9 — RAG over past resolved NCRs) */}
      <AISuggestionSection pid={pid} ncrId={ncrId} isQE={isQE} isClosed={isClosed} />

      {/* Root cause */}
      <div>
        <h4 className="qms-section-heading qms-ncr-block-heading">
          {isQE && !isClosed ? <label htmlFor={rootCauseId}>Root cause</label> : 'Root cause'}
        </h4>
        {isQE && !isClosed ? (
          <>
            <textarea
              id={rootCauseId}
              className="qms-ncr-textarea"
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              rows={2}
              placeholder="What caused this non-conformance?"
            />
            <div className="qms-ncr-block-actions">
              <Button size="sm" variant="outline" disabled={busy || rootCause.trim() === (ncr.root_cause ?? '')} onClick={saveRootCause}>
                Save root cause
              </Button>
            </div>
          </>
        ) : (
          <p className={`qms-ncr-block-text ${ncr.root_cause ? '' : 'text-muted'}`}>{ncr.root_cause ?? 'Not recorded yet.'}</p>
        )}
      </div>

      {/* Corrective actions */}
      <div>
        <h4 className="qms-section-heading qms-ncr-block-heading">Corrective actions</h4>
        {ncr.corrective_actions.length === 0 ? (
          <p className="text-muted qms-ncr-block-empty">None logged yet.</p>
        ) : (
          <table className="qms-table qms-ncr-block-table">
            <thead>
              <tr><th>Action</th><th>Assigned</th><th>Due</th><th>Status</th></tr>
            </thead>
            <tbody>
              {ncr.corrective_actions.map((a) => (
                <tr key={a.action_id}>
                  <td>{a.action_description}</td>
                  <td>{a.assigned_to_name ?? '—'}</td>
                  <td>{fmtDate(a.due_date)}</td>
                  <td>
                    {isQE && !isClosed ? (
                      <Select
                        aria-label={`Status — ${a.action_description}`}
                        value={a.status}
                        onChange={(e) => setActionStatus(a.action_id, e.target.value as ActionStatus)}
                        options={ACTION_STATUS_OPTIONS}
                      />
                    ) : (
                      <Badge variant={ACTION_BADGE[a.status].variant}>{ACTION_BADGE[a.status].label}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {isQE && !isClosed && (
          <div className="qms-grid-3 qms-ncr-block-form">
            <Input label="New action" value={actionDesc} onChange={(e) => setActionDesc(e.target.value)} placeholder="e.g. Re-pour affected section" />
            <Input label="Due date" type="date" value={actionDue} onChange={(e) => setActionDue(e.target.value)} />
            <div>
              <Button size="sm" variant="outline" icon={<Plus size={14} />} disabled={busy || actionDesc.trim() === ''} onClick={addActionSubmit}>
                Add action
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Penalties */}
      <div>
        <h4 className="qms-section-heading qms-ncr-block-heading">Penalties</h4>
        {ncr.penalties.length === 0 ? (
          <p className="text-muted qms-ncr-block-empty">None applied.</p>
        ) : (
          <table className="qms-table qms-ncr-block-table">
            <thead>
              <tr><th>Type</th><th>Amount</th><th>Notes</th><th>Applied by</th></tr>
            </thead>
            <tbody>
              {ncr.penalties.map((p) => (
                <tr key={p.penalty_id}>
                  <td className="font-medium">{PENALTY_LABEL[p.penalty_type]}</td>
                  <td>{p.amount != null ? p.amount.toLocaleString() : '—'}</td>
                  <td>{p.description ?? '—'}</td>
                  <td>{p.applied_by_name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {isQE && !isClosed && (
          <div className="qms-grid-3 qms-ncr-block-form">
            <Select
              label="Penalty type"
              value={penaltyType}
              onChange={(e) => setPenaltyType(e.target.value as PenaltyType)}
              options={PENALTY_OPTIONS}
            />
            <Input label="Amount (optional)" type="number" min="0" value={penaltyAmount} onChange={(e) => setPenaltyAmount(e.target.value)} />
            <Input label="Notes (optional)" value={penaltyDesc} onChange={(e) => setPenaltyDesc(e.target.value)} />
            <div>
              <Button size="sm" variant="outline" icon={<Gavel size={14} />} disabled={busy} onClick={addPenaltySubmit}>
                Apply penalty
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
