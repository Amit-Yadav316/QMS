import React, { useMemo, useState } from 'react';
import { AlertTriangle, TestTube } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { ErrorBox } from '../ui/ErrorBox';
import { getApiErrorMessage } from '../../api/client';
import type { CubeSampleResponse } from '../../types/master';
import { AGE_FRACTION, AGE_OPTIONS, fmtDate, RESULT_LABEL, RESULT_VARIANT } from './cubeFormat';
import { useRecordTest } from './queries';

interface SampleDetailProps {
  sample: CubeSampleResponse;
  isQE: boolean;
  pid: number;
}

export const SampleDetail: React.FC<SampleDetailProps> = ({ sample, isQE, pid }) => {
  const record = useRecordTest(pid);
  const [error, setError] = useState<string | null>(null);
  const [age, setAge] = useState('28');
  const [testDate, setTestDate] = useState('');
  const [observed, setObserved] = useState('');

  // Client-side preview of the required strength (server is authoritative).
  const requiredHint = useMemo(() => {
    const fck = sample.grade_min_strength_mpa;
    if (fck == null) return null;
    return Math.round(fck * (AGE_FRACTION[Number(age)] ?? 1) * 100) / 100;
  }, [sample.grade_min_strength_mpa, age]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await record.mutateAsync({
        sampleId: sample.sample_id,
        data: {
          test_age_days: Number(age),
          test_date: testDate,
          observed_strength_mpa: Number(observed),
        },
      });
      setTestDate('');
      setObserved('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to record test result.'));
    }
  };

  return (
    <div className="qms-cube-detail">
      {error && <ErrorBox>{error}</ErrorBox>}

      {sample.tests.length === 0 ? (
        <p className="text-muted qms-cube-detail-empty">No results recorded yet.</p>
      ) : (
        <table className="qms-table qms-cube-detail-table">
          <thead>
            <tr><th>Age</th><th>Test date</th><th>Observed</th><th>Required</th><th>Result</th><th>NCR</th></tr>
          </thead>
          <tbody>
            {sample.tests.map((t) => (
              <tr key={t.test_id}>
                <td>{t.test_age_days}-day</td>
                <td>{fmtDate(t.test_date)}</td>
                <td className="font-medium">{t.observed_strength_mpa} MPa</td>
                <td>{t.required_strength_mpa} MPa</td>
                <td><Badge variant={RESULT_VARIANT[t.result_status]}>{RESULT_LABEL[t.result_status]}</Badge></td>
                <td>
                  {t.ncr_id
                    ? <span className="text-danger qms-cube-ncr-link"><AlertTriangle size={13} /> {t.ncr_number}</span>
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isQE && (
        <form onSubmit={handleSubmit}>
          <div className="qms-grid-3 qms-cube-record-grid">
            <Select
              label="Test age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              options={AGE_OPTIONS.map((a) => ({ label: `${a}-day`, value: a }))}
            />
            <Input
              label="Test date"
              type="date"
              required
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
            />
            <Input
              label={`Observed strength (MPa)${requiredHint != null ? ` · needs ≈ ${requiredHint}` : ''}`}
              type="number"
              step="0.1"
              min="0"
              required
              value={observed}
              onChange={(e) => setObserved(e.target.value)}
            />
          </div>
          <div className="qms-form-actions qms-cube-actions">
            <Button type="submit" variant="primary" size="sm" icon={<TestTube size={14} />}
              disabled={record.isPending || testDate === '' || observed === ''}>
              {record.isPending ? 'Saving…' : 'Record result'}
            </Button>
          </div>
          <p className="qms-text-sm text-muted qms-cube-record-note">
            A result below the required strength auto-raises an NCR (critical below 85%).
          </p>
        </form>
      )}
    </div>
  );
};
