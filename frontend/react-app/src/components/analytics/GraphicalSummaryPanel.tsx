// Graphical summary — a Minitab-style descriptive report for one filtered cube
// strength dataset: histogram with a fitted normal PDF + Gaussian KDE overlay, a
// boxplot, a normal probability (Q–Q) plot, and a panel of descriptive stats
// with the Anderson–Darling normality test and a 95% CI for the mean. Every
// number comes from the backend (/analytics/graphical-summary); the frontend
// only lays it out. See backend/app/core/statistics.py:graphical_summary.

import React, { forwardRef, useState } from 'react';
import {
  Bar, CartesianGrid, ComposedChart, Line, ReferenceLine,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import { useGraphicalSummary } from '../../queries/analytics';

type Opt = { label: string; value: string | number };

interface Props {
  pid: number;
  gradeOpts: Opt[];
  towerOpts: Opt[];
  contractorOpts: Opt[];
  firstGrade: string;
  firstTower: string;
  tid: (v: string) => number | undefined;
  clause?: React.ReactNode; // code-clause citation shown under the heading
}

const num = (v: string): number | undefined => (v ? Number(v) : undefined);
const fmt = (x: number | null | undefined, dp = 2): string =>
  x == null ? '—' : x.toLocaleString(undefined, { maximumFractionDigits: dp });

const filterRow: React.CSSProperties = {
  display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12,
};

// Horizontal boxplot (min–Q1–median–Q3–max) drawn in a fixed 0..1000 viewBox and
// mapped from the data range, so it scales with its container.
const BoxPlot: React.FC<{ min: number; q1: number; median: number; q3: number; max: number }> = ({
  min, q1, median, q3, max,
}) => {
  const lo = min, hi = max;
  const span = hi - lo || 1;
  const X = (v: number) => 30 + ((v - lo) / span) * 940; // 30..970 px
  const yMid = 40;
  return (
    <svg viewBox="0 0 1000 80" width="100%" height={80} preserveAspectRatio="none" role="img"
      aria-label="Boxplot of strengths">
      {/* whiskers */}
      <line x1={X(min)} y1={yMid} x2={X(q1)} y2={yMid} stroke="var(--gray-400)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      <line x1={X(q3)} y1={yMid} x2={X(max)} y2={yMid} stroke="var(--gray-400)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      <line x1={X(min)} y1={yMid - 10} x2={X(min)} y2={yMid + 10} stroke="var(--gray-400)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      <line x1={X(max)} y1={yMid - 10} x2={X(max)} y2={yMid + 10} stroke="var(--gray-400)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      {/* box */}
      <rect x={X(q1)} y={yMid - 16} width={Math.max(1, X(q3) - X(q1))} height={32}
        fill="var(--blue)" fillOpacity={0.14} stroke="var(--blue)" strokeWidth={1.5} rx={2} vectorEffect="non-scaling-stroke" />
      {/* median */}
      <line x1={X(median)} y1={yMid - 16} x2={X(median)} y2={yMid + 16} stroke="var(--blue)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
      {/* end labels */}
      <text x={X(min)} y={yMid + 30} fontSize={11} fill="var(--gray-500)" textAnchor="middle">{fmt(min)}</text>
      <text x={X(max)} y={yMid + 30} fontSize={11} fill="var(--gray-500)" textAnchor="middle">{fmt(max)}</text>
    </svg>
  );
};

export const GraphicalSummaryPanel = forwardRef<HTMLDivElement, Props>(function GraphicalSummaryPanel(
  { pid, gradeOpts, towerOpts, contractorOpts, firstGrade, firstTower, tid, clause }, ref,
) {
  const [g, setG] = useState('');
  const [t, setT] = useState('');
  const [c, setC] = useState('ALL');
  const grade = g || firstGrade;
  const tower = t || firstTower;

  const { data } = useGraphicalSummary(pid, {
    grade_id: num(grade), tower_id: tid(tower),
    contractor_id: c !== 'ALL' ? Number(c) : undefined,
  });

  const hasStats = data != null && data.mean != null && data.histogram.length > 0;

  // Overlay the fitted normal + KDE densities on the frequency histogram by
  // scaling density → expected count (density · N · bin_width).
  const scale = hasStats ? data!.sample_count * (data!.bin_width ?? 1) : 1;
  const chartRows = hasStats
    ? [
        ...data!.histogram.map((b) => ({ x: (b.bin_low + b.bin_high) / 2, count: b.count })),
        ...data!.fit_curve.map((p, i) => ({
          x: p.x, fit: p.y * scale, kde: (data!.kde_curve[i]?.y ?? 0) * scale,
        })),
      ].sort((a, b) => a.x - b.x)
    : [];

  const qq = hasStats ? data!.prob_points.map((p) => ({ x: p.value, y: p.theoretical })) : [];
  const qqLo = qq.length ? Math.min(...qq.map((p) => Math.min(p.x, p.y))) : 0;
  const qqHi = qq.length ? Math.max(...qq.map((p) => Math.max(p.x, p.y))) : 1;

  return (
    <div ref={ref}>
      <Card>
        <h3 className="qms-chart-heading">
          Graphical summary
          {data?.grade_name ? ` · ${data.grade_name}` : ''}
          {hasStats ? ` (n ${data!.sample_count})` : ''}
        </h3>
        {clause && <div className="qms-clause-block">{clause}</div>}
        <p className="qms-chart-sub">
          Distribution shape, normality and dispersion of cube strengths — histogram with a fitted
          normal curve and kernel density, a boxplot, a normal probability plot, and the
          Anderson–Darling test for normality.
        </p>

        <div style={filterRow}>
          <Select label="Grade" fullWidth={false} value={grade} onChange={(e) => setG(e.target.value)} options={gradeOpts} />
          <Select label="Tower" fullWidth={false} value={tower} onChange={(e) => setT(e.target.value)} options={towerOpts} />
          {contractorOpts.length > 0 && (
            <Select label="Contractor" fullWidth={false} value={c} onChange={(e) => setC(e.target.value)}
              options={[{ label: 'All contractors', value: 'ALL' }, ...contractorOpts]} />
          )}
        </div>

        {!hasStats ? (
          <p className="text-muted" style={{ fontSize: 14, margin: 0 }}>
            Need at least two cube results for this selection to build the summary.
          </p>
        ) : (
          <div className="qms-gs-grid">
            {/* Left: the three plots */}
            <div className="qms-gs-plots">
              <div>
                <div className="qms-gs-plot-title">Histogram · fitted normal &amp; KDE</div>
                <ResponsiveContainer width="100%" height={230}>
                  <ComposedChart data={chartRows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                    <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 11 }}
                      axisLine={false} tickLine={false} unit=" MPa" />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                      label={{ value: 'frequency', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--gray-500)' }} />
                    <Tooltip
                      formatter={(v, name) =>
                        name === 'count' ? [v, 'count'] : [Number(v).toFixed(2), name === 'fit' ? 'normal' : 'KDE']}
                      labelFormatter={(x) => `${Number(x).toFixed(1)} MPa`} />
                    <Bar dataKey="count" name="count" fill="var(--blue)" fillOpacity={0.28}
                      stroke="var(--blue)" strokeOpacity={0.5} barSize={26} maxBarSize={40} isAnimationActive={false} />
                    <Line dataKey="fit" name="fit" type="monotone" dot={false} connectNulls
                      stroke="var(--blue)" strokeWidth={2} isAnimationActive={false} />
                    <Line dataKey="kde" name="kde" type="monotone" dot={false} connectNulls
                      stroke="var(--amber, #d97706)" strokeWidth={2} strokeDasharray="5 3" isAnimationActive={false} />
                    {data!.mean != null && (
                      <ReferenceLine x={data!.mean} stroke="var(--green)" strokeDasharray="4 4"
                        label={{ value: 'X̄', fontSize: 11, fill: 'var(--green)' }} />
                    )}
                    {data!.fck != null && (
                      <ReferenceLine x={data!.fck} stroke="var(--red)" strokeDasharray="4 4"
                        label={{ value: `fck ${data!.fck}`, fontSize: 11, fill: 'var(--red)' }} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div>
                <div className="qms-gs-plot-title">Boxplot</div>
                <BoxPlot min={data!.minimum!} q1={data!.q1!} median={data!.median!} q3={data!.q3!} max={data!.maximum!} />
              </div>

              <div>
                <div className="qms-gs-plot-title">Normal probability plot (Q–Q)</div>
                <ResponsiveContainer width="100%" height={210}>
                  <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                    <XAxis type="number" dataKey="x" name="observed" domain={[qqLo, qqHi]} tick={{ fontSize: 11 }}
                      axisLine={false} tickLine={false} unit=" MPa" />
                    <YAxis type="number" dataKey="y" name="theoretical" domain={[qqLo, qqHi]} tick={{ fontSize: 11 }}
                      axisLine={false} tickLine={false}
                      label={{ value: 'expected', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--gray-500)' }} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }}
                      formatter={(v) => `${Number(v).toFixed(1)} MPa`} />
                    <ReferenceLine segment={[{ x: qqLo, y: qqLo }, { x: qqHi, y: qqHi }]}
                      stroke="var(--gray-400)" strokeDasharray="4 4" />
                    <Scatter data={qq} fill="var(--blue)" isAnimationActive={false} />
                  </ScatterChart>
                </ResponsiveContainer>
                <p className="qms-chart-hint" style={{ marginTop: 0 }}>
                  Points on the diagonal ⇒ strengths follow a normal distribution.
                </p>
              </div>
            </div>

            {/* Right: descriptive statistics */}
            <div className="qms-gs-stats">
              <div className="qms-gs-stats-title">Descriptive statistics</div>
              <dl className="qms-gs-dl">
                <dt>N</dt><dd>{data!.sample_count}</dd>
                <dt>Mean</dt><dd>{fmt(data!.mean)} MPa</dd>
                <dt>StDev</dt><dd>{fmt(data!.std_dev)}</dd>
                <dt>Variance</dt><dd>{fmt(data!.variance)}</dd>
                <dt>Skewness</dt><dd>{fmt(data!.skewness, 3)}</dd>
                <dt>Kurtosis</dt><dd>{fmt(data!.kurtosis, 3)}</dd>
                <dt>Minimum</dt><dd>{fmt(data!.minimum)}</dd>
                <dt>1st quartile</dt><dd>{fmt(data!.q1)}</dd>
                <dt>Median</dt><dd>{fmt(data!.median)}</dd>
                <dt>3rd quartile</dt><dd>{fmt(data!.q3)}</dd>
                <dt>Maximum</dt><dd>{fmt(data!.maximum)}</dd>
              </dl>

              <div className="qms-gs-stats-title">Anderson–Darling normality</div>
              {data!.ad_statistic == null ? (
                <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>Not available (zero variance).</p>
              ) : (
                <>
                  <dl className="qms-gs-dl">
                    <dt>A²</dt><dd>{fmt(data!.ad_statistic, 3)}</dd>
                    <dt>p-value</dt><dd>{data!.ad_p_value! < 0.005 ? '< 0.005' : fmt(data!.ad_p_value, 3)}</dd>
                  </dl>
                  <span className={`qms-gs-verdict ${data!.is_normal ? 'is-ok' : 'is-warn'}`}>
                    {data!.is_normal ? 'Data appears normal (p > 0.05)' : 'Departs from normal (p ≤ 0.05)'}
                  </span>
                </>
              )}

              <div className="qms-gs-stats-title">
                {Math.round((data!.ci_confidence ?? 0.95) * 100)}% CI for the mean
              </div>
              <div className="qms-gs-ci">
                {fmt(data!.ci_mean_low)} &nbsp;–&nbsp; {fmt(data!.ci_mean_high)} MPa
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
});
