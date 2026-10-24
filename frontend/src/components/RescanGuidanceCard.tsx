import React, { useState } from 'react';
import {
  AlertTriangle,
  Camera,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Sparkles,
  Maximize2,
  RotateCw,
  Sun,
  Contrast,
  Sliders,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { QualityClassification, RescanGuidanceItem } from '../types';

interface RescanGuidanceCardProps {
  guidance?: RescanGuidanceItem[];
  classification: QualityClassification;
  rescanRecommended?: boolean;
  filename?: string;
}

export const RescanGuidanceCard: React.FC<RescanGuidanceCardProps> = ({
  guidance = [],
  classification,
  rescanRecommended = false,
  filename,
}) => {
  const isFail = classification === 'Fail' || rescanRecommended;
  // Fail documents have the panel expanded by default; Pass/Review documents start collapsed or expandable
  const [isExpanded, setIsExpanded] = useState<boolean>(isFail);
  const [copied, setCopied] = useState<boolean>(false);

  // If there are no detected defects needing guidance, provide best practice capture checklist
  const displayGuidance = guidance.length > 0 ? guidance : [
    {
      defect: 'general',
      severity: 'good' as const,
      title: 'Lighting & Focus',
      tip: 'Hold camera steady, tap screen to focus, and ensure even diffuse light without direct reflections.',
      explanation: 'Your document passed basic checks. Follow standard framing for highest OCR accuracy.',
    },
    {
      defect: 'cutoff',
      severity: 'good' as const,
      title: 'Page Framing',
      tip: 'Keep entire page inside frame with a 1-inch border around all edges.',
      explanation: 'Ensure all 4 margins remain completely visible.',
    },
  ];

  const getDefectIcon = (defect: string) => {
    switch (defect.toLowerCase()) {
      case 'blur':
        return <Camera className="w-5 h-5 text-amber-500" />;
      case 'glare':
        return <Sparkles className="w-5 h-5 text-amber-400" />;
      case 'skew':
        return <RotateCw className="w-5 h-5 text-indigo-400" />;
      case 'cutoff':
        return <Maximize2 className="w-5 h-5 text-rose-500" />;
      case 'brightness':
        return <Sun className="w-5 h-5 text-yellow-500" />;
      case 'contrast':
        return <Contrast className="w-5 h-5 text-cyan-400" />;
      case 'orientation':
        return <RotateCw className="w-5 h-5 text-rose-400" />;
      default:
        return <Sliders className="w-5 h-5 text-primary-400" />;
    }
  };

  const handleCopyTips = () => {
    const text = displayGuidance
      .map((g, i) => `${i + 1}. [${g.title}] ${g.tip}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 overflow-hidden shadow-lg ${
        isFail
          ? 'bg-rose-950/20 border-rose-500/40 dark:bg-rose-950/30 dark:border-rose-500/50'
          : 'bg-slate-900/40 border-slate-700/50 dark:bg-slate-900/60'
      }`}
    >
      {/* Header Bar */}
      <div
        className={`px-6 py-4 flex items-center justify-between cursor-pointer select-none border-b transition-colors ${
          isFail
            ? 'bg-rose-900/30 border-rose-500/30 hover:bg-rose-900/40'
            : 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-800/60'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-md ${
              isFail
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'bg-primary-500/20 text-primary-400 border border-primary-500/40'
            }`}
          >
            {isFail ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-100 text-base md:text-lg">
                {isFail ? 'Rescan Guidance & Defect Diagnosis' : 'Capture Best Practices & Rescan Guidance'}
              </h3>
              {isFail && (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                  Re-Scan Advised
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {isFail
                ? `Quality was below acceptable OCR threshold. Follow actionable tips below to capture a clean scan.`
                : `Tips and guidelines to ensure optimal OCR readability and archival quality.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyTips();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600/50 transition-colors"
            title="Copy actionable tips"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Tips'}</span>
          </button>
          <div className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* Expandable Content Body */}
      {isExpanded && (
        <div className="p-6 space-y-4">
          {isFail && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs md:text-sm text-rose-200">
                <span className="font-semibold">Why this scan failed:</span> Automated corrections were applied, but initial capture defects ({displayGuidance.map((g) => g.title).join(', ')}) were severe enough that optical character recognition may lose critical words or numbers. Re-capturing with the guidance below will produce an optimal scan.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayGuidance.map((item, idx) => {
              const isCrit = item.severity === 'critical';
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all ${
                    isCrit
                      ? 'bg-rose-900/15 border-rose-500/40 hover:border-rose-500/60'
                      : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-slate-800/70 border border-slate-700/50">
                        {getDefectIcon(item.defect)}
                      </div>
                      <h4 className="text-sm font-semibold text-slate-200">{item.title}</h4>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isCrit
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : item.severity === 'warning'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {item.severity}
                    </span>
                  </div>

                  {item.explanation && (
                    <p className="text-xs text-slate-400 mb-2 italic">
                      "{item.explanation}"
                    </p>
                  )}

                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/40 text-xs text-slate-100 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-emerald-400">Action: </span>
                      <span>{item.tip}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Capture Checklist */}
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <span className="font-medium text-slate-300">Quick 4-Point Capture Rules:</span>
            <div className="flex flex-wrap gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                Diffused ambient light (no flash)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                Parallel camera angle
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                1-inch margin around page
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                Tap screen to focus
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default RescanGuidanceCard;
