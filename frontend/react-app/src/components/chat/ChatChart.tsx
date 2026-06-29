// Renders a deterministic ChartSpec (built server-side from the agent's tool
// results) as a recharts bar / line / pie. Mirrors the chart setup in
// pages/project/Analytics.tsx. Guards against empty data.

import React from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { ChartSpec } from '../../api/chat';

const COLORS = ['var(--blue)', 'var(--green)', 'var(--amber)', 'var(--red)', '#8b5cf6', '#06b6d4'];

export const ChatChart: React.FC<{ spec: ChartSpec }> = ({ spec }) => {
  if (!spec.data || spec.data.length === 0 || spec.series.length === 0) return null;

  let chart: React.ReactElement;
  if (spec.type === 'pie') {
    chart = (
      <PieChart>
        <Tooltip />
        <Legend />
        <Pie data={spec.data} dataKey={spec.series[0].key} nameKey={spec.x_key} outerRadius={70} label>
          {spec.data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    );
  } else if (spec.type === 'line') {
    chart = (
      <LineChart data={spec.data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
        <XAxis dataKey={spec.x_key} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip />
        {spec.series.length > 1 && <Legend />}
        {spec.series.map((s, i) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name}
            stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} connectNulls />
        ))}
      </LineChart>
    );
  } else {
    chart = (
      <BarChart data={spec.data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
        <XAxis dataKey={spec.x_key} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip />
        {spec.series.length > 1 && <Legend />}
        {spec.series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    );
  }

  return (
    <div className="qms-chat-chart">
      <div className="qms-chat-chart-title">{spec.title}</div>
      <ResponsiveContainer width="100%" height={200}>
        {chart}
      </ResponsiveContainer>
    </div>
  );
};
