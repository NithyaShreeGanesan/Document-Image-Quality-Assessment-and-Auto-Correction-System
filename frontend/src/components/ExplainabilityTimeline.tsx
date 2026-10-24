import React from 'react';
import {
  RotateCw,
  Sun,
  Volume2,
  Sparkles,
  Crop,
  Binary,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Flame,
  Check,
  Compass,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import { CorrectionItem, PerStepScoreItem } from '../types';

interface ExplainabilityTimelineProps {
  corrections: CorrectionItem[];
  perStepScores?: PerStepScoreItem[];
  initialScore?: number;
  finalScore?: number;
}

const STEP_ICONS: Record<string, React.ElementType> = {
  auto_orient: Compass,
  deskew: RotateCw,
  illumination: Sun,
  denoise: Volume2,
  sharpen: Sparkles,
  autocrop: Crop,
  binarization: Binary,
};

const STEP_TITLES: Record<string, string> = {
  auto_orient: 'Auto-Orientation',
  deskew: 'Orientation & Deskew',
  illumination: 'Illumination & Glare Normalization',
  denoise: 'Bilateral Noise Suppression',
  sharpen: 'Adaptive Edge Sharpening',
  autocrop: 'Contour & Border Trimming',
  binarization: 'OCR-Optimized Binarization',
};

export const ExplainabilityTimeline: React.FC<ExplainabilityTimelineProps> = ({
  corrections = [],
  perStepScores = [],
  initialScore = 50,
  finalScore = 80,
}) => {
  // If perStepScores is empty but corrections exist, create synthetic step entries
  const steps: PerStepScoreItem[] = React.useMemo(() => {
    if (perStepScores && perStepScores.length > 0) {
      return perStepScores;
    }
    if (!corrections || corrections.length === 0) {
      return [];
    }
    // Synthesize fallback steps distributed across the delta
    const totalDelta = finalScore - initialScore;
    const perStepDelta = corrections.length > 0 ? totalDelta / corrections.length : 0;
    let running = initialScore;

    return corrections.map((c, idx) => {
      const stepDelta = round(perStepDelta, 1);
      const pre = running;
      running += stepDelta;
      return {
        step_name: c.step_name,
        order: c.order ?? idx,
        pre_score: round(pre, 1),
        post_score: round(running, 1),
        delta: stepDelta,
        defect_addressed: c.step_name === 'deskew'
          ? 'Rotational Skew & Text Tilt'
          : c.step_name === 'illumination'
          ? 'Uneven Shadows & Lighting'
          : c.step_name === 'denoise'
          ? 'High Sensor Noise & Grain'
          : c.step_name === 'sharpen'
          ? 'Soft Character Strokes'
          : 'Extraneous Border Noise',
        description: c.description || 'Targeted algorithmic transformation',
      };
    });
  }, [perStepScores, corrections, initialScore, finalScore]);

  // Construct waterfall chart data
  const waterfallData = React.useMemo(() => {
    if (steps.length === 0) return [];

    const data: any[] = [];
    // 1. Raw Input Base
    data.push({
      name: 'Raw Input',
      score: initialScore,
      delta: 0,
      runningScore: initialScore,
      fill: '#94a3b8',
      isBase: true,
    });

    // 2. Intermediate Steps
    steps.forEach((s) => {
      const label = STEP_TITLES[s.step_name] || s.step_name.replace('_', ' ');
      // Shorten label for chart axis
      const shortLabel = label.split(' ')[0];
      data.push({
        name: shortLabel,
        fullName: label,
        score: s.post_score,
        delta: s.delta,
        runningScore: s.post_score,
        fill: s.delta >= 0 ? '#10b981' : '#f43f5e',
        defect: s.defect_addressed,
      });
    });

    // 3. Final Delivered Score
    data.push({
      name: 'Delivered',
      fullName: 'Final Delivered Quality',
      score: finalScore,
      delta: round(finalScore - initialScore, 1),
      runningScore: finalScore,
      fill: '#6366f1',
      isFinal: true,
    });

    return data;
  }, [steps, initialScore, finalScore]);

  if (steps.length === 0) {
    return (
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-2">
        <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
          Optimal Quality • No Corrections Applied
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          This document scored above the passing threshold for all metrics on ingestion. No restorative interventions were necessary.
        </p>
      </div>
    );
  }

  const netDelta = round(finalScore - initialScore, 1);

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
              What We Fixed & Why
            </h3>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800">
              Explainable AI
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Transparent per-step attribution of defects addressed, corrective algorithms, and quality delta
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono ${
              netDelta >= 0
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {netDelta >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {netDelta >= 0 ? `+${netDelta}` : `${netDelta}`} pts Total Gain
          </span>
        </div>
      </div>

      {/* Waterfall Chart Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Score Progression Waterfall (Raw Input &rarr; Step Delta &rarr; Delivered)
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Initial: {initialScore} &rarr; Delivered: {finalScore}
          </span>
        </div>

        <div className="w-full h-56 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={waterfallData}
              margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  color: '#f8fafc',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(val: any, _name: any, item: any) => {
                  const p = item.payload;
                  if (p.isBase) return [`${p.score} / 100`, 'Initial Score'];
                  if (p.isFinal) return [`${p.score} / 100`, 'Final Score'];
                  return [
                    `${p.score} (${p.delta >= 0 ? '+' : ''}${p.delta} pts)`,
                    p.fullName || 'Step Score',
                  ];
                }}
              />
              <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" opacity={0.6} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {waterfallData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* "What We Fixed & Why" Interactive Timeline */}
      <div className="space-y-4 pt-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Applied Restoration Pipeline Sequence
        </h4>

        <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {steps.map((step, idx) => {
            const Icon = STEP_ICONS[step.step_name] || Sparkles;
            const title = STEP_TITLES[step.step_name] || step.step_name.replace('_', ' ');
            const isPositive = step.delta >= 0;

            return (
              <div key={idx} className="relative group">
                {/* Timeline Node Icon */}
                <div
                  className={`absolute -left-6 top-1.5 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-900 transition-all ${
                    isPositive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                </div>

                {/* Step Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-all space-y-2">
                  {/* Step Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        Step {idx + 1}
                      </span>
                      <h5 className="font-semibold text-xs text-slate-900 dark:text-white capitalize">
                        {title}
                      </h5>
                    </div>

                    {/* Delta Badge */}
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                        isPositive
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {step.delta} pts
                    </span>
                  </div>

                  {/* Defect Addressed Tag */}
                  {step.defect_addressed && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Original Defect:
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/40">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        {step.defect_addressed}
                      </span>
                    </div>
                  )}

                  {/* Action Description */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Score Progression Footer */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-2 font-mono">
                      <span>Score: {step.pre_score}</span>
                      <span>&rarr;</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {step.post_score}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Executed automatically
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function round(val: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}
