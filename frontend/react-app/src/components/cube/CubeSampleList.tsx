import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import type { CubeSampleResponse } from '../../types/master';
import { fmtDate, RESULT_LABEL, RESULT_VARIANT, sampleLocation, worstResult } from './cubeFormat';
import { SampleDetail } from './SampleDetail';

interface CubeSampleListProps {
  samples: CubeSampleResponse[];
  loading: boolean;
  isQE: boolean;
  pid: number;
}

export const CubeSampleList: React.FC<CubeSampleListProps> = ({ samples, loading, isQE, pid }) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const toggle = (id: number) => setExpandedId((cur) => (cur === id ? null : id));

  return (
    <Card className="qms-form-section" padding="none">
      <div className="qms-table-container">
        <table className="qms-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}><span className="qms-sr-only">Expand</span></th>
              <th>Sample</th><th>Location</th><th>Grade</th>
              <th>Cast date</th><th>Lab</th><th>Result</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-muted">Loading…</td></tr>
            ) : samples.length === 0 ? (
              <tr><td colSpan={7} className="text-muted">No cube samples yet.</td></tr>
            ) : (
              samples.map((s) => {
                const worst = worstResult(s.tests);
                const open = expandedId === s.sample_id;
                const label = s.sample_reference ?? `CS-${s.sample_id}`;
                const detailId = `cube-detail-${s.sample_id}`;
                return (
                  <React.Fragment key={s.sample_id}>
                    <tr className="qms-cube-row" onClick={() => toggle(s.sample_id)}>
                      <td>
                        <button
                          type="button"
                          className="qms-cube-expand-btn"
                          aria-expanded={open}
                          aria-controls={detailId}
                          aria-label={`${open ? 'Collapse' : 'Expand'} ${label}`}
                          onClick={(e) => { e.stopPropagation(); toggle(s.sample_id); }}
                        >
                          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td className="font-medium">{label}</td>
                      <td>{sampleLocation(s)}</td>
                      <td>{s.grade_name ?? '—'}</td>
                      <td>{fmtDate(s.cast_date)}</td>
                      <td>{s.lab_name ?? '—'}</td>
                      <td>
                        {worst
                          ? <Badge variant={RESULT_VARIANT[worst]}>{RESULT_LABEL[worst]}</Badge>
                          : <span className="text-muted">No result</span>}
                      </td>
                    </tr>
                    {open && (
                      <tr id={detailId}>
                        <td colSpan={7} className="qms-cube-detail-cell">
                          <SampleDetail sample={s} isQE={isQE} pid={pid} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
