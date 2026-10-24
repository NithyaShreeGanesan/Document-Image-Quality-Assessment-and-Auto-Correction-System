import React, { useState, useEffect } from 'react';
import { AnalyticsSummary, AnalyticsTrendPoint } from '../types';
import { analyticsApi } from '../api/client';
import {
  BarChart3,
  TrendingUp,
  FileCheck2,
  AlertTriangle,
  XCircle,
  Sparkles,
  PieChart as PieIcon,
  Loader2,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrendPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [sumData, trendData] = await Promise.all([
          analyticsApi.getSummary(),
          analyticsApi.getTrends(14),
        ]);
        setSummary(sumData);
        setTrends(trendData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Compiling Analytics & Quality Trend Reports...
        </p>
      </div>
    );
  }

  const pieData = [
    { name: 'Pass', value: summary?.pass_count ?? 0, color: '#10B981' },
    { name: 'Needs Correction', value: summary?.needs_correction_count ?? 0, color: '#F59E0B' },
    { name: 'Fail', value: summary?.fail_count ?? 0, color: '#EF4444' },
  ].filter((d) => d.value > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              Quality Analytics & Trends
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Aggregate quality metrics, defect distributions, and restoration performance
          </p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Documents */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Documents Processed
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-black text-3xl text-slate-900 dark:text-white">
              {summary?.total_documents ?? 0}
            </span>
            <span className="text-xs text-slate-400">total scans</span>
          </div>
        </div>

        {/* Pass Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pass Rate (OCR-Ready)
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileCheck2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-black text-3xl text-emerald-600 dark:text-emerald-400">
              {summary?.pass_rate ?? 0}%
            </span>
            <span className="text-xs text-slate-400">score ≥ 75</span>
          </div>
        </div>

        {/* Avg Score Before vs After */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Average Score Delta
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-black text-3xl text-slate-900 dark:text-white">
              {summary?.avg_score_before ?? 0}
            </span>
            <span className="text-base font-bold text-slate-400">→</span>
            <span className="font-display font-black text-3xl text-emerald-600 dark:text-emerald-400">
              {summary?.avg_score_after ?? 0}
            </span>
          </div>
        </div>

        {/* Average Improvement */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Restoration Delta
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-black text-3xl text-emerald-600 dark:text-emerald-400">
              +{(summary?.avg_improvement ?? 0).toFixed(1)}
            </span>
            <span className="text-xs text-slate-400">pts average lift</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quality Over Time Line Chart (8 cols) */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
              Quality Score Trajectory
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Daily average quality score before restoration vs. after auto-correction
            </p>
          </div>

          <div className="w-full h-72">
            {trends.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Not enough historical trend data recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      color: '#f8fafc',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Line
                    type="monotone"
                    dataKey="avg_score_before"
                    name="Initial Score (Before)"
                    stroke="#F43F5E"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_score_after"
                    name="Restored Score (After)"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status Distribution Donut Chart (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="mb-2">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
              Status Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pass, Needs Correction, and Fail ratio
            </p>
          </div>

          <div className="w-full h-56 flex items-center justify-center">
            {pieData.length === 0 ? (
              <p className="text-xs text-slate-400">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      color: '#f8fafc',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Donut Legend */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Pass (≥ 75)
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {summary?.pass_count ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Needs Correction (45-74)
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {summary?.needs_correction_count ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Fail (&lt; 45 / Re-scan)
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {summary?.fail_count ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Most Common Defects Bar Chart */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="mb-4">
          <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
            Most Prevalent Document Quality Defects
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Frequency of defects detected across uploads (blur, skew, lighting, shadows, noise)
          </p>
        </div>

        {summary?.most_common_defects && summary.most_common_defects.length > 0 ? (
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary.most_common_defects}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  width={140}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    color: '#f8fafc',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: any, item: any) => [
                    `${value} documents (${item.payload.percentage}%)`,
                    'Defect Count',
                  ]}
                />
                <Bar dataKey="count" fill="#6366F1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-8 text-center">
            No defect breakdown recorded yet. Upload sample documents to populate frequency metrics.
          </p>
        )}
      </div>
    </div>
  );
};
