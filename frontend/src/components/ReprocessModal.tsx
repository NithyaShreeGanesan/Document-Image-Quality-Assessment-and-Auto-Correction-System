import React, { useState } from 'react';
import { ReprocessOptions } from '../types';
import {
  X,
  RotateCw,
  Sun,
  Volume2,
  Sparkles,
  Crop,
  Binary,
  Sliders,
  Check,
  Loader2,
} from 'lucide-react';

interface ReprocessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReprocess: (options: ReprocessOptions) => Promise<void>;
  initialOptions?: Partial<ReprocessOptions>;
}

export const ReprocessModal: React.FC<ReprocessModalProps> = ({
  isOpen,
  onClose,
  onReprocess,
  initialOptions,
}) => {
  const [options, setOptions] = useState<ReprocessOptions>({
    deskew: initialOptions?.deskew ?? true,
    illumination: initialOptions?.illumination ?? true,
    denoise: initialOptions?.denoise ?? true,
    sharpen: initialOptions?.sharpen ?? true,
    autocrop: initialOptions?.autocrop ?? false,
    binarize: initialOptions?.binarize ?? false,
    clahe_clip_limit: initialOptions?.clahe_clip_limit ?? 2.0,
    force_deskew: initialOptions?.force_deskew ?? false,
    force_illumination: initialOptions?.force_illumination ?? false,
    force_denoise: initialOptions?.force_denoise ?? false,
    force_sharpen: initialOptions?.force_sharpen ?? false,
  });

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onReprocess(options);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      key: 'deskew',
      label: 'Deskew & Rotation',
      description: 'Auto-level tilted document angles with white border margins.',
      icon: RotateCw,
      forceKey: 'force_deskew',
    },
    {
      key: 'illumination',
      label: 'Illumination & Shadow Removal',
      description: 'CLAHE local contrast equalization and background Gaussian division.',
      icon: Sun,
      forceKey: 'force_illumination',
    },
    {
      key: 'denoise',
      label: 'Non-Local Means Denoising',
      description: 'Removes camera grain, salt-and-pepper noise, and compression noise.',
      icon: Volume2,
      forceKey: 'force_denoise',
    },
    {
      key: 'sharpen',
      label: 'Adaptive Unsharp Masking',
      description: 'Recovers blurry character edges and strokes without halos.',
      icon: Sparkles,
      forceKey: 'force_sharpen',
    },
    {
      key: 'autocrop',
      label: 'Contour Auto-Crop & Perspective',
      description: 'Detects page boundary polygon and clips background table clutter.',
      icon: Crop,
    },
    {
      key: 'binarize',
      label: 'OCR-Optimized Binarization',
      description: 'High-contrast monochrome thresholding tuned for OCR extraction engines.',
      icon: Binary,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Re-Process with Custom Corrections
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manually toggle and tune individual correction algorithms
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="space-y-3">
            {steps.map((step) => {
              const Icon = step.icon;
              const isEnabled = !!options[step.key as keyof ReprocessOptions];
              const forceKey = step.forceKey as keyof ReprocessOptions | undefined;
              const isForced = forceKey ? !!options[forceKey] : false;

              return (
                <div
                  key={step.key}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isEnabled
                      ? 'bg-slate-50/80 dark:bg-slate-800/40 border-indigo-200 dark:border-indigo-900/60'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${
                          isEnabled
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-xs text-slate-900 dark:text-white block">
                          {step.label}
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {step.description}
                        </p>
                      </div>
                    </div>

                    {/* Main Switch */}
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) =>
                          setOptions((prev) => ({
                            ...prev,
                            [step.key]: e.target.checked,
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {/* Force option check */}
                  {isEnabled && forceKey && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">
                        Force step even if defect was rated Good
                      </span>
                      <label className="flex items-center gap-1.5 cursor-pointer text-indigo-600 dark:text-indigo-400 font-medium">
                        <input
                          type="checkbox"
                          checked={isForced}
                          onChange={(e) =>
                            setOptions((prev) => ({
                              ...prev,
                              [forceKey]: e.target.checked,
                            }))
                          }
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        Always Apply
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* CLAHE Clip Limit Slider */}
          {options.illumination && (
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                <span className="text-slate-700 dark:text-slate-300">CLAHE Contrast Clip Limit</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {options.clahe_clip_limit?.toFixed(1) || '2.0'}
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.2"
                value={options.clahe_clip_limit ?? 2.0}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    clahe_clip_limit: parseFloat(e.target.value),
                  }))
                }
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>Subtle (1.0)</span>
                <span>Balanced (2.0)</span>
                <span>Aggressive (5.0)</span>
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Reprocessing...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Apply & Reprocess
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
