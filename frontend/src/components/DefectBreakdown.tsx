import React from 'react';
import { DefectItem } from '../types';
import {
  Focus,
  RotateCw,
  Sun,
  Contrast,
  Volume2,
  Maximize,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
} from 'lucide-react';

interface DefectBreakdownProps {
  defects: DefectItem[];
  title?: string;
}

export const DefectBreakdown: React.FC<DefectBreakdownProps> = ({
  defects,
  title = 'Defect Diagnostics & Sub-Scores',
}) => {
  const getMetricIcon = (metric: string) => {
    switch (metric.toLowerCase()) {
      case 'blur':
        return Focus;
      case 'skew':
        return RotateCw;
      case 'brightness':
        return Sun;
      case 'contrast':
        return Contrast;
      case 'noise':
        return Volume2;
      case 'resolution':
        return Maximize;
      default:
        return Focus;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'good':
        return {
          icon: CheckCircle2,
          bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          barColor: 'bg-emerald-500',
          label: 'Good',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          barColor: 'bg-amber-500',
          label: 'Warning',
        };
      case 'critical':
        return {
          icon: AlertOctagon,
          bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          barColor: 'bg-rose-500',
          label: 'Critical',
        };
      default:
        return {
          icon: CheckCircle2,
          bg: 'bg-slate-50 text-slate-700',
          barColor: 'bg-slate-400',
          label: status,
        };
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="font-display font-semibold text-sm text-slate-800 dark:text-slate-100">
          {title}
        </h4>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {defects.filter((d) => d.status !== 'good').length} defect(s) detected
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {defects.map((defect) => {
          const Icon = getMetricIcon(defect.metric);
          const badge = getStatusBadge(defect.status);
          const StatusIcon = badge.icon;

          return (
            <div
              key={defect.metric}
              className={`p-3 rounded-xl border transition-all ${
                defect.status === 'critical'
                  ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                  : defect.status === 'warning'
                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Header row: Icon, Label, Status, Sub-score */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      defect.status === 'good'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        : defect.status === 'warning'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-medium text-xs text-slate-900 dark:text-slate-100 block">
                      {defect.label}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      Raw: {defect.raw_value} {defect.unit}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {badge.label}
                  </span>
                  <span className="font-display font-bold text-sm text-slate-800 dark:text-white min-w-[28px] text-right">
                    {Math.round(defect.sub_score)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${badge.barColor}`}
                  style={{ width: `${Math.max(4, Math.min(100, defect.sub_score))}%` }}
                />
              </div>

              {/* Plain-language explanation */}
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {defect.explanation}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
