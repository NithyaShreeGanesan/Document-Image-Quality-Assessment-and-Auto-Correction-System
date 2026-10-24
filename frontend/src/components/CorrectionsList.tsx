import React from 'react';
import { CorrectionItem } from '../types';
import {
  RotateCw,
  Sun,
  Volume2,
  Sparkles,
  Crop,
  Binary,
  CheckCircle2,
  Wand2,
} from 'lucide-react';

interface CorrectionsListProps {
  corrections: CorrectionItem[];
}

export const CorrectionsList: React.FC<CorrectionsListProps> = ({ corrections }) => {
  const getCorrectionIcon = (stepName: string) => {
    switch (stepName.toLowerCase()) {
      case 'deskew':
        return RotateCw;
      case 'illumination':
        return Sun;
      case 'denoise':
        return Volume2;
      case 'sharpen':
        return Sparkles;
      case 'autocrop':
        return Crop;
      case 'binarization':
        return Binary;
      default:
        return Wand2;
    }
  };

  const getStepTitle = (stepName: string) => {
    switch (stepName.toLowerCase()) {
      case 'deskew':
        return '1. Orientation & Deskew';
      case 'illumination':
        return '2. Illumination & Shadow Normalization';
      case 'denoise':
        return '3. Non-Local Means Denoising';
      case 'sharpen':
        return '4. Adaptive Unsharp Masking';
      case 'autocrop':
        return '5. Contour Detection & Perspective Crop';
      case 'binarization':
        return '6. OCR-Optimized Binarization';
      default:
        return stepName;
    }
  };

  if (!corrections || corrections.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center">
        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          No Auto-Corrections Needed
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Image met or exceeded quality thresholds across all evaluated metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h4 className="font-display font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          <Wand2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Targeted Auto-Corrections Applied ({corrections.length})
        </h4>
        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
          Targeted & Non-Destructive
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {corrections.map((corr) => {
          const Icon = getCorrectionIcon(corr.step_name);
          return (
            <div
              key={corr.step_name}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                    {getStepTitle(corr.step_name)}
                  </h5>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Applied
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                  {corr.description || 'Targeted correction applied based on diagnostic metrics.'}
                </p>

                {corr.params && Object.keys(corr.params).length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    {Object.entries(corr.params)
                      .filter(([key]) => key !== 'description' && key !== 'applied' && key !== 'reason')
                      .map(([key, val]) => (
                        <span
                          key={key}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        >
                          {key}: {typeof val === 'number' ? val.toFixed(1) : String(val)}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
