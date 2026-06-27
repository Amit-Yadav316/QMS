import React from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { Badge } from '../ui/Badge';
import type {
  ActionStatus,
  ConfidenceLevel,
  NCRResponse,
  NCRStatus,
  PenaltyType,
  ResultStatus,
} from '../../types/master';

// ── Badge / option maps shared across the list and detail panel ────────────────

export const STATUS_BADGE: Record<NCRStatus, { variant: 'pass' | 'warn' | 'pending'; label: string; icon?: React.ReactNode }> = {
  OPEN: { variant: 'pending', label: 'Open' },
  UNDER_REVIEW: { variant: 'warn', label: 'Under review', icon: <Clock size={12} /> },
  CLOSED: { variant: 'pass', label: 'Closed', icon: <CheckCircle size={12} /> },
};

export const ACTION_BADGE: Record<ActionStatus, { variant: 'pass' | 'warn' | 'pending'; label: string }> = {
  PENDING: { variant: 'pending', label: 'Pending' },
  IN_PROGRESS: { variant: 'warn', label: 'In progress' },
  COMPLETED: { variant: 'pass', label: 'Completed' },
};

export const ACTION_STATUS_OPTIONS = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'In progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
];

export const PENALTY_LABEL: Record<PenaltyType, string> = {
  RATE_REDUCTION: 'Rate reduction',
  REJECTION: 'Rejection',
  DEMOLITION: 'Demolition',
};
export const PENALTY_OPTIONS = Object.entries(PENALTY_LABEL).map(([value, label]) => ({ value, label }));

export const CONFIDENCE_BADGE: Record<ConfidenceLevel, { variant: 'pass' | 'warn' | 'pending'; label: string }> = {
  HIGH: { variant: 'pass', label: 'High confidence' },
  MEDIUM: { variant: 'warn', label: 'Medium confidence' },
  LOW: { variant: 'pending', label: 'Low confidence' },
};

// ── Formatters ─────────────────────────────────────────────────────────────────

export const severityBadge = (result: ResultStatus | null) =>
  result === 'CRITICAL_FAILURE'
    ? <Badge variant="fail">Critical</Badge>
    : <Badge variant="warn">High</Badge>;

export const fmtDate = (iso: string | null): string => (iso ? new Date(iso).toLocaleDateString() : '—');

export const issueText = (n: NCRResponse): string => {
  const grade = n.grade_name ?? 'concrete';
  if (n.observed_strength_mpa != null && n.required_strength_mpa != null) {
    const verb = n.result_status === 'CRITICAL_FAILURE' ? 'critical cube failure' : 'cube test failure';
    return `${grade} ${verb} — ${n.observed_strength_mpa} / ${n.required_strength_mpa} MPa @ ${n.test_age_days ?? '?'}d`;
  }
  return `${grade} cube test failure`;
};

export const ncrLocation = (n: NCRResponse): string =>
  [n.tower_name, n.floor_label, n.component_type].filter(Boolean).join(' · ') || '—';
