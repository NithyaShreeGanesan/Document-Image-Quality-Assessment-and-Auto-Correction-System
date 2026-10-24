import React from 'react';
import { QualityClassification } from '../types';
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';

interface MetricGaugeProps {
  score: number;
  classification?: QualityClassification | string;
  delta?: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  subtext?: string;
}

export const MetricGauge: React.FC<MetricGaugeProps> = ({
  score,
  classification,
  delta,
  size = 'md',
  label,
  subtext,
}) => {
  // Normalize score between 0 and 100
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

  // Color schemes based on score and classification
  let color = '#10B981'; // Emerald Pass
  let bgTrack = 'rgba(16, 185, 129, 0.15)';
  let badgeBg = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
  let badgeIcon = CheckCircle2;
  let statusText = classification || (normalizedScore >= 75 ? 'Pass' : normalizedScore >= 45 ? 'Needs Correction' : 'Fail');

  if (statusText === 'Fail' || normalizedScore < 45) {
    color = '#EF4444'; // Crimson
    bgTrack = 'rgba(239, 68, 68, 0.15)';
    badgeBg = 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800';
    badgeIcon = XCircle;
  } else if (statusText === 'Needs Correction' || normalizedScore < 75) {
    color = '#F59E0B'; // Amber
    bgTrack = 'rgba(245, 158, 11, 0.15)';
    badgeBg = 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    badgeIcon = AlertTriangle;
  }

  const BadgeIcon = badgeIcon;

  // Sizing configurations
  const dimensions = {
    sm: { size: 90, stroke: 7, font: 'text-xl', badge: 'text-xs' },
    md: { size: 140, stroke: 10, font: 'text-3xl', badge: 'text-sm' },
    lg: { size: 190, stroke: 14, font: 'text-5xl', badge: 'text-base' },
  }[size];

  const radius = (dimensions.size - dimensions.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-3 text-center">
      {label && (
        <span className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          {label}
        </span>
      )}

      {/* SVG Circular Gauge */}
      <div className="relative flex items-center justify-center" style={{ width: dimensions.size, height: dimensions.size }}>
        <svg
          className="transform -rotate-90"
          width={dimensions.size}
          height={dimensions.size}
        >
          {/* Background Track */}
          <circle
            cx={dimensions.size / 2}
            cy={dimensions.size / 2}
            r={radius}
            stroke={bgTrack}
            strokeWidth={dimensions.stroke}
            fill="transparent"
          />
          {/* Animated Value Arc */}
          <circle
            cx={dimensions.size / 2}
            cy={dimensions.size / 2}
            r={radius}
            stroke={color}
            strokeWidth={dimensions.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Score Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-display font-extrabold text-slate-900 dark:text-white ${dimensions.font} tracking-tight`}>
            {normalizedScore}
          </span>
          <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">
            / 100
          </span>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mt-3 flex items-center gap-1.5 flex-wrap justify-center">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold border shadow-2xs ${badgeBg} ${dimensions.badge}`}
        >
          <BadgeIcon className="w-3.5 h-3.5" />
          {statusText}
        </span>

        {/* Improvement Delta Badge */}
        {delta !== undefined && (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
              delta > 0
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : delta < 0
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} pts
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {subtext}
        </p>
      )}
    </div>
  );
};
