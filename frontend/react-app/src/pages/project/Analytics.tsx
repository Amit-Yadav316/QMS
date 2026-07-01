// Analytics — the four IS-456 / IS-10262 statistical charts, all driven by the
// tower / grade / date (+ element) filter bar. The Overview dashboard keeps the
// KPI cards; this page is the quality-statistics workbench.

import React, { useMemo, useState } from 'react';
import {
  Area, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { useProject } from '../../components/layout/ProjectLayout';
import {
  useDistribution, useRunChart, useStrengthVsAge, useTargetMean,
} from '../../queries/analytics';
import { useProjectTowers } from '../../queries/floors';
import { useGrades, useComponents } from '../../queries/catalog';
import type { QualityFilters } from '../../types/master';
import './Analytics.css';

const empty = (
  <p className="text-muted" style={{ fontSize: 14, margin: 0 }}>
    No cube-test data matches the current filters yet.
  </p>
);

export const Analytics: React.FC = () => {
  const { project } = useProject();
  const pid = project.project_id;

  const [towerId, setTowerId] = useState('ALL');
  const [gradeId, setGradeId] = useState('ALL');
  const [componentId, setComponentId] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filters = useMemo<QualityFilters>(() => {
    const f: QualityFilters = {};
    if (towerId !== 'ALL') f.tower_id = Number(towerId);
    if (gradeId !== 'ALL') f.grade_id = Number(gradeId);
    if (componentId !== 'ALL') f.component_id = Number(componentId);
    if (dateFrom) f.date_from = dateFrom;
    if (dateTo) f.date_to = dateTo;
    return f;
  }, [towerId, gradeId, componentId, dateFrom, dateTo]);

  const { data: towers = [] } = useProjectTowers(pid);
  const { data: grades = [] } = useGrades();
  const { data: components = [] } = useComponents();
  const { data: run } = useRunChart(pid, filters);
  const { data: dist } = useDistribution(pid, filters);
  const { data: target } = useTargetMean(pid, filters);
  const { data: age } = useStrengthVsAge(pid, filters);

  const runData = (run?.points ?? []).map((p, i) => ({ ...p, idx: i + 1 }));
  const targetRows = target?.rows ?? [];

  return (
    <div className="qms-analytics">
      <div className="qms-analytics-header">
        <div>
          <h1 className="qms-page-title-main">Analytics</h1>
          <p className="qms-page-subtitle">IS 456 / IS 10262 concrete-strength statistics</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Select label="Tower" fullWidth={false} value={towerId} onChange={(e) => setTowerId(e.target.value)}
            options={[{ label: 'All towers', value: 'ALL' }, ...towers.map((t) => ({ label: t.tower_name, value: t.tower_id }))]} />
          <Select label="Grade" fullWidth={false} value={gradeId} onChange={(e) => setGradeId(e.target.value)}
            options={[{ label: 'All grades', value: 'ALL' }, ...grades.map((g) => ({ label: g.grade_name, value: g.grade_id }))]} />
          <Select label="Element" fullWidth={false} value={componentId} onChange={(e) => setComponentId(e.target.value)}
            options={[{ label: 'All elements', value: 'ALL' }, ...components.map((c) => ({ label: c.component_type, value: c.component_id }))]} />
          <Input label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} fullWidth={false} />
          <Input label="To" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} fullWidth={false} />
        </div>
      </div>

      {/* 1 · Quality control run chart */}
      <Card>
        <h3 className="qms-chart-heading">
          Quality control run chart {run?.grade_name ? `— ${run.grade_name}` : '(filter to one grade for control lines)'}
        </h3>
        {runData.length === 0 ? empty : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={runData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
              <XAxis dataKey="idx" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'batch (chronological)', position: 'insideBottom', offset: -2, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit=" MPa" />
              <Tooltip formatter={(v) => `${v} MPa`} labelFormatter={(i) => runData[Number(i) - 1]?.test_date ?? ''} />
              {run?.fck != null && <ReferenceLine y={run.fck} stroke="var(--green)" strokeDasharray="4 4" label={{ value: `fck ${run.fck}`, fontSize: 11, fill: 'var(--green)' }} />}
              {run?.individual_min != null && <ReferenceLine y={run.individual_min} stroke="var(--red)" strokeDasharray="4 4" label={{ value: `min ${run.individual_min}`, fontSize: 11, fill: 'var(--red)' }} />}
              {run?.target_mean != null && <ReferenceLine y={run.target_mean} stroke="var(--blue)" strokeDasharray="4 4" label={{ value: `target ${run.target_mean}`, fontSize: 11, fill: 'var(--blue)' }} />}
              <Line type="monotone" dataKey="observed_mpa" name="Observed" stroke="var(--blue)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="qms-an-grid-2">
        {/* 2 · Normal distribution curve */}
        <Card>
          <h3 className="qms-chart-heading">Normal distribution {dist?.mean != null ? `(X̄ ${dist.mean}, S ${dist.std_dev}, n ${dist.sample_count})` : ''}</h3>
          {(dist?.curve.length ?? 0) === 0 ? (
            <p className="text-muted" style={{ fontSize: 14, margin: 0 }}>Need at least two results to draw the curve.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={dist!.curve}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} unit=" MPa" />
                <YAxis tick={false} axisLine={false} tickLine={false} width={8} />
                <Tooltip formatter={(v) => Number(v).toFixed(4)} labelFormatter={(x) => `${x} MPa`} />
                <Area type="monotone" dataKey="y" stroke="var(--blue)" fill="var(--blue)" fillOpacity={0.12} strokeWidth={2} />
                {dist?.fck != null && <ReferenceLine x={dist.fck} stroke="var(--red)" strokeDasharray="4 4" label={{ value: `fck ${dist.fck}`, fontSize: 11, fill: 'var(--red)' }} />}
                {dist?.mean != null && <ReferenceLine x={dist.mean} stroke="var(--green)" strokeDasharray="4 4" label={{ value: 'X̄', fontSize: 11, fill: 'var(--green)' }} />}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* 3 · Target mean strength bar */}
        <Card>
          <h3 className="qms-chart-heading">Target mean vs achieved (per grade)</h3>
          {targetRows.length === 0 ? empty : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={targetRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                <XAxis dataKey="grade_name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit=" MPa" />
                <Tooltip formatter={(v) => `${v} MPa`} />
                <Legend />
                <Bar dataKey="target_mean" name="Target mean (fck+1.65S)" fill="var(--blue)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual_mean" name="Achieved average" fill="var(--green)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* 4 · Compressive strength vs age */}
      <Card>
        <h3 className="qms-chart-heading">
          Compressive strength vs age {age?.grade_name ? `— ${age.grade_name}` : ''} {age?.reference ? `· ${age.reference}` : ''}
        </h3>
        {(age?.points.length ?? 0) === 0 ? (
          <p className="text-muted" style={{ fontSize: 14, margin: 0 }}>
            Filter to a specific tower / element / date to trace one component's curing curve.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={age!.points}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
              <XAxis dataKey="test_age_days" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit=" d" />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit=" MPa" />
              <Tooltip formatter={(v) => `${v} MPa`} labelFormatter={(d) => `${d}-day`} />
              <Legend />
              <Line type="monotone" dataKey="observed_mpa" name="Observed" stroke="var(--blue)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="required_mpa" name="Required" stroke="var(--gray-400)" strokeDasharray="4 4" strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
};
