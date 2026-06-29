import React, { useState } from 'react';
import { AlertTriangle, Copy, FileDown, Send } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ErrorBox } from '../ui/ErrorBox';
import { getApiErrorMessage } from '../../api/client';
import { cubeTestsApi } from '../../api/cubeTests';
import type { CubeSampleResponse } from '../../types/master';
import { REPORT_AGES } from '../../types/master';
import { fmtDate, RESULT_LABEL, RESULT_VARIANT } from './cubeFormat';
import { useReportLink, useResendReportLink } from './queries';

interface SampleDetailProps {
  sample: CubeSampleResponse;
  isQE: boolean;
  pid: number;
}

export const SampleDetail: React.FC<SampleDetailProps> = ({ sample, isQE, pid }) => {
  const link = useReportLink(pid);
  const resend = useResendReportLink(pid);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [resent, setResent] = useState(false);

  const submittedAges = new Set(sample.tests.map((t) => t.test_age_days));

  const copyLink = async () => {
    setError(null);
    try {
      const res = await link.mutateAsync(sample.sample_id);
      await navigator.clipboard.writeText(res.report_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to get the lab report link.'));
    }
  };

  const resendEmail = async () => {
    setError(null);
    try {
      await resend.mutateAsync(sample.sample_id);
      setResent(true);
      setTimeout(() => setResent(false), 2500);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to email the lab report link.'));
    }
  };

  const download = async (documentId: number) => {
    setError(null);
    try {
      await cubeTestsApi.downloadReport(pid, documentId);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to download the report.'));
    }
  };

  return (
    <div className="qms-cube-detail">
      {error && <ErrorBox>{error}</ErrorBox>}

      {sample.tests.length === 0 ? (
        <p className="text-muted qms-cube-detail-empty">No lab results submitted yet.</p>
      ) : (
        <table className="qms-table qms-cube-detail-table">
          <thead>
            <tr>
              <th>Age</th><th>Test date</th><th>Observed</th><th>Required</th>
              <th>Result</th><th>Report</th><th>NCR</th>
            </tr>
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
                  {t.report_document_id
                    ? (
                      <button
                        type="button"
                        className="qms-cube-report-link"
                        onClick={() => download(t.report_document_id as number)}
                      >
                        <FileDown size={13} /> PDF
                      </button>
                    )
                    : '—'}
                </td>
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
        <div className="qms-cube-lab-panel">
          <div className="qms-cube-lab-status">
            {sample.lab_name
              ? <>Lab: <strong>{sample.lab_name}</strong></>
              : <span className="text-muted">No lab assigned — pick a lab when casting to dispatch reports.</span>}
            {sample.lab_name && (
              sample.testing_started_on
                ? <> · testing started {fmtDate(sample.testing_started_on)}</>
                : <> · awaiting the lab to set the testing day</>
            )}
          </div>

          <div className="qms-cube-milestones">
            {REPORT_AGES.map((age) => {
              const done = submittedAges.has(age);
              return (
                <Badge key={age} variant={done ? 'pass' : 'pending'}>
                  {age}-day {done ? '✓' : 'pending'}
                </Badge>
              );
            })}
          </div>

          <div className="qms-form-actions qms-cube-actions">
            <Button
              type="button" variant="outline" size="sm" icon={<Copy size={14} />}
              onClick={copyLink} disabled={link.isPending}
            >
              {copied ? 'Copied!' : 'Copy lab link'}
            </Button>
            <Button
              type="button" variant="outline" size="sm" icon={<Send size={14} />}
              onClick={resendEmail} disabled={resend.isPending || !sample.lab_id}
            >
              {resent ? 'Sent!' : sample.report_link_sent ? 'Resend email' : 'Email link'}
            </Button>
          </div>
          <p className="qms-text-sm text-muted qms-cube-record-note">
            The lab submits the 7/14/28-day reports through this link. A failing
            28-day result auto-raises an NCR.
          </p>
        </div>
      )}
    </div>
  );
};
