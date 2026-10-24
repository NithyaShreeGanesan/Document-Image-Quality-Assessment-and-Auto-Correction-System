import React, { useState, useEffect } from 'react';
import { AnalyticsSummary, AnalyticsTrendPoint, UserSatisfactionData } from '../types';
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
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
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
  const [satisfaction, setSatisfaction] = useState<UserSatisfactionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [sumData, trendData, satData] = await Promise.all([
          analyticsApi.getSummary(),
          analyticsApi.getTrends(14),
          analyticsApi.getFeedback(),
        ]);
        setSummary(sumData);
        setTrends(trendData);
        setSatisfaction(satData);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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

        {/* OCR Confidence Gain KPI Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/10 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Avg OCR Confidence Gain
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-black text-3xl text-indigo-600 dark:text-indigo-400">
              {((summary?.avg_ocr_confidence_gain ?? 0) >= 0 ? '+' : '')}
              {(summary?.avg_ocr_confidence_gain ?? 0).toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400">
              +{summary?.total_words_recovered ?? 0} words
            </span>
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

      {/* OCR Confidence Trajectory Chart */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
              OCR Recognition Confidence: Before vs. After
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Evolution of mean word-level confidence and character legibility post auto-restoration
          </p>
        </div>

        <div className="w-full h-64">
          {trends.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No historical OCR trend data recorded yet.
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
                  formatter={(val: any) => [`${val}%`, 'Mean Confidence']}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line
                  type="monotone"
                  dataKey="avg_ocr_confidence_before"
                  name="OCR Conf (Before Restoration)"
                  stroke="#F43F5E"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="avg_ocr_confidence_after"
                  name="OCR Conf (After Restoration)"
                  stroke="#6366F1"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
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

      {/* User Satisfaction & Feedback Loop Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Breakdown & Satisfaction Score */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-emerald-500" />
                User Satisfaction Score
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                End-user evaluation of auto-correction and OCR readability
              </p>
            </div>
            {satisfaction && satisfaction.total_feedback > 0 && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold font-mono ${
                satisfaction.satisfaction_rate >= 80
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : satisfaction.satisfaction_rate >= 60
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
              }`}>
                {satisfaction.satisfaction_rate}% Satisfaction
              </span>
            )}
          </div>

          {satisfaction && satisfaction.total_feedback > 0 ? (
            <>
              {/* Ratio Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    {satisfaction.thumbs_up_count} Thumbs Up ({Math.round((satisfaction.thumbs_up_count / satisfaction.total_feedback) * 100)}%)
                  </span>
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                    <ThumbsDown className="w-3.5 h-3.5" />
                    {satisfaction.thumbs_down_count} Thumbs Down ({Math.round((satisfaction.thumbs_down_count / satisfaction.total_feedback) * 100)}%)
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                  <div
                    style={{
                      width: `${(satisfaction.thumbs_up_count / satisfaction.total_feedback) * 100}%`,
                    }}
                    className="bg-emerald-500 h-full transition-all duration-500"
                  />
                  <div
                    style={{
                      width: `${(satisfaction.thumbs_down_count / satisfaction.total_feedback) * 100}%`,
                    }}
                    className="bg-rose-500 h-full transition-all duration-500"
                  />
                </div>
              </div>

              {/* Stat Counters */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {satisfaction.total_feedback}
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Total Ratings</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-center">
                  <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {satisfaction.thumbs_up_count}
                  </span>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Approvals</p>
                </div>
                <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-center">
                  <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
                    {satisfaction.thumbs_down_count}
                  </span>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300">Tune Requests</p>
                </div>
              </div>

              {/* Recent User Quotes */}
              {satisfaction.recent_feedback && satisfaction.recent_feedback.some(f => f.comment) && (
                <div className="pt-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    Recent Operator Comments:
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {satisfaction.recent_feedback
                      .filter(f => f.comment)
                      .slice(0, 4)
                      .map((fb, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs flex items-start gap-2"
                        >
                          {fb.rating === 'thumbs_up' ? (
                            <ThumbsUp className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          ) : (
                            <ThumbsDown className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <span className="text-slate-800 dark:text-slate-200">
                              "{fb.comment}"
                            </span>
                            {fb.disliked_steps && fb.disliked_steps.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {fb.disliked_steps.map((st) => (
                                  <span
                                    key={st}
                                    className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 uppercase font-mono"
                                  >
                                    {st}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center">
              No feedback collected yet. Rate corrections on the Result page to see satisfaction ratings here.
            </p>
          )}
        </div>

        {/* Most Disliked Steps Breakdown */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Most Frequently Disliked Correction Steps
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Identifies auto-correction steps that cause over-processing or artifacts
            </p>
          </div>

          {satisfaction?.most_disliked_steps && satisfaction.most_disliked_steps.length > 0 ? (
            <div className="space-y-3 pt-1">
              {satisfaction.most_disliked_steps.map((item) => (
                <div key={item.step} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                      {item.step.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-rose-600 dark:text-rose-400 font-semibold">
                      {item.count} flag{item.count > 1 ? 's' : ''} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, item.percentage)}%` }}
                      className="bg-rose-500 h-full rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              ))}
              <div className="p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-700 dark:text-indigo-300">
                💡 <b>Adaptive Suggestion Engine:</b> Go to <b>Settings &rarr; Suggestions</b> to review automatic parameter calibrations based on these user flags.
              </div>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4">
              <Sparkles className="w-8 h-8 text-indigo-400 mb-2 opacity-60" />
              <p className="text-xs text-slate-400">
                No negative correction steps flagged. When users thumbs-down a specific step, frequency tallies will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
