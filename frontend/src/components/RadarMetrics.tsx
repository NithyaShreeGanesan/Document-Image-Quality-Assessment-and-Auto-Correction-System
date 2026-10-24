import React, { useState } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { AssessmentResponse } from '../types';
import { BarChart3, Radar as RadarIcon } from 'lucide-react';

interface RadarMetricsProps {
  before?: AssessmentResponse;
  after?: AssessmentResponse;
}

export const RadarMetrics: React.FC<RadarMetricsProps> = ({ before, after }) => {
  const [chartType, setChartType] = useState<'radar' | 'bar'>('radar');

  const metricsData = [
    {
      metric: 'Blur / Sharpness',
      key: 'blur',
      before: before?.blur_score ?? 0,
      after: after?.blur_score ?? 0,
      fullMark: 100,
    },
    {
      metric: 'Skew Alignment',
      key: 'skew',
      before: before?.skew_score ?? 0,
      after: after?.skew_score ?? 0,
      fullMark: 100,
    },
    {
      metric: 'Brightness',
      key: 'brightness',
      before: before?.brightness_score ?? 0,
      after: after?.brightness_score ?? 0,
      fullMark: 100,
    },
    {
      metric: 'Contrast',
      key: 'contrast',
      before: before?.contrast_score ?? 0,
      after: after?.contrast_score ?? 0,
      fullMark: 100,
    },
    {
      metric: 'Denoising',
      key: 'noise',
      before: before?.noise_score ?? 0,
      after: after?.noise_score ?? 0,
      fullMark: 100,
    },
    {
      metric: 'Resolution',
      key: 'resolution',
      before: before?.resolution_score ?? 0,
      after: after?.resolution_score ?? 0,
      fullMark: 100,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header & Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-display font-semibold text-sm text-slate-800 dark:text-slate-100">
            6-Metric Quality Profile
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comparison of normalized 0-100 sub-scores
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
          <button
            onClick={() => setChartType('radar')}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              chartType === 'radar'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
            title="Radar Chart"
          >
            <RadarIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              chartType === 'bar'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
            title="Bar Chart"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chart Visuals */}
      <div className="w-full flex-1 min-h-[280px]">
        {chartType === 'radar' ? (
          <ResponsiveContainer width="100%" height={290}>
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={metricsData}>
              <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" opacity={0.6} />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
              />
              <Radar
                name="Before (Original)"
                dataKey="before"
                stroke="#F43F5E"
                fill="#F43F5E"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              {after && (
                <Radar
                  name="After (Corrected)"
                  dataKey="after"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.35}
                  strokeWidth={2}
                />
              )}
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                iconType="circle"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  color: '#f8fafc',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={metricsData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis
                dataKey="metric"
                angle={-20}
                textAnchor="end"
                interval={0}
                tick={{ fill: '#64748b', fontSize: 10 }}
              />
              <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  color: '#f8fafc',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="before" name="Before" fill="#F43F5E" radius={[4, 4, 0, 0]} />
              {after && <Bar dataKey="after" name="After" fill="#10B981" radius={[4, 4, 0, 0]} />}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
