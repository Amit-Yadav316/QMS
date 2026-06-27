import type { CubeSampleResponse, CubeTestResponse, ResultStatus } from '../../types/master';

export const RESULT_VARIANT: Record<ResultStatus, 'pass' | 'fail' | 'warn' | 'pending'> = {
  PENDING: 'pending', PASS: 'pass', FAIL: 'warn', CRITICAL_FAILURE: 'fail',
};

export const RESULT_LABEL: Record<ResultStatus, string> = {
  PENDING: 'Pending', PASS: 'Pass', FAIL: 'Fail', CRITICAL_FAILURE: 'Critical',
};

// Mirrors backend quality_engine.DEFAULT_AGE_FRACTIONS — a client-side hint only;
// the server computes the authoritative required strength.
export const AGE_FRACTION: Record<number, number> = { 7: 0.65, 14: 0.9, 28: 1.0 };
export const AGE_OPTIONS = [7, 14, 28];

export const fmtDate = (iso: string | null): string => (iso ? new Date(iso).toLocaleDateString() : '—');

// Worst outcome across a sample's tests, for the collapsed row summary.
export const worstResult = (tests: CubeTestResponse[]): ResultStatus | null => {
  if (tests.some((t) => t.result_status === 'CRITICAL_FAILURE')) return 'CRITICAL_FAILURE';
  if (tests.some((t) => t.result_status === 'FAIL')) return 'FAIL';
  if (tests.some((t) => t.result_status === 'PENDING')) return 'PENDING';
  if (tests.length > 0) return 'PASS';
  return null;
};

export const sampleLocation = (s: CubeSampleResponse): string =>
  [s.tower_name, s.floor_label, s.component_type].filter(Boolean).join(' · ') || '—';
