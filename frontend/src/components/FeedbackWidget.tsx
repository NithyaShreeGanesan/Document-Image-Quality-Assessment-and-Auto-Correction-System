import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Check, Sparkles } from 'lucide-react';
import { FeedbackItem } from '../types';
import { documentApi } from '../api/client';

interface FeedbackWidgetProps {
  documentId: string;
  appliedSteps?: string[];
  initialFeedback?: FeedbackItem;
  onFeedbackSubmitted?: (feedback: FeedbackItem) => void;
}

const STEP_LABELS: Record<string, { label: string; desc: string }> = {
  deskew: { label: 'Deskew', desc: 'Alignment / Tilt angle' },
  illumination: { label: 'Illumination', desc: 'Lighting & local contrast' },
  denoise: { label: 'Denoise', desc: 'Smoothing & grain reduction' },
  sharpen: { label: 'Sharpen', desc: 'Edge & contour crispness' },
  binarization: { label: 'Binarization', desc: 'Black & white thresholding' },
  autocrop: { label: 'Auto-Crop', desc: 'Margin & border trimming' },
  auto_orient: { label: 'Auto-Orient', desc: '90°/180° page rotation' },
};

const COMMON_CHIPS = [
  'Over-smoothed text',
  'Contrast too aggressive',
  'Artifacts around stamps',
  'Faint text lost',
  'Edges over-sharpened',
];

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({
  documentId,
  appliedSteps = [],
  initialFeedback,
  onFeedbackSubmitted,
}) => {
  const [rating, setRating] = useState<'thumbs_up' | 'thumbs_down' | null>(
    initialFeedback?.rating || null
  );
  const [comment, setComment] = useState<string>(initialFeedback?.comment || '');
  const [dislikedSteps, setDislikedSteps] = useState<string[]>(
    initialFeedback?.disliked_steps || []
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(Boolean(initialFeedback));
  const [error, setError] = useState<string | null>(null);

  const toggleStep = (step: string) => {
    setDislikedSteps((prev) =>
      prev.includes(step) ? prev.filter((s) => s !== s) : [...prev, step]
    );
  };

  const handleChipClick = (chip: string) => {
    if (!comment) {
      setComment(chip);
    } else if (!comment.includes(chip)) {
      setComment(`${comment}, ${chip}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return;
    setSubmitting(true);
    setError(null);

    try {
      const fb = await documentApi.submitFeedback(documentId, {
        rating,
        comment: comment.trim() || undefined,
        disliked_steps: rating === 'thumbs_down' ? dislikedSteps : [],
      });
      setSubmitted(true);
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(fb);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  // Determine which steps to show checkboxes for: prioritize applied steps or defaults
  const availableSteps = appliedSteps.length > 0
    ? appliedSteps
    : ['deskew', 'illumination', 'denoise', 'sharpen', 'binarization'];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-medium">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Rate this Correction
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Help train adaptive calibration suggestions for your archive
            </p>
          </div>
        </div>

        {submitted && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <Check className="w-3 h-3" /> Recorded
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rating Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setRating('thumbs_up');
              setSubmitted(false);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
              rating === 'thumbs_up'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 text-slate-700 dark:text-slate-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${rating === 'thumbs_up' ? 'fill-emerald-500' : ''}`} />
            <span>Looks Good</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRating('thumbs_down');
              setSubmitted(false);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
              rating === 'thumbs_down'
                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-700 text-slate-700 dark:text-slate-300 hover:bg-rose-50/50 dark:hover:bg-rose-950/20'
            }`}
          >
            <ThumbsDown className={`w-4 h-4 ${rating === 'thumbs_down' ? 'fill-rose-500' : ''}`} />
            <span>Needs Tuning</span>
          </button>
        </div>

        {/* Step-level Dislikes (shown if thumbs_down) */}
        {rating === 'thumbs_down' && (
          <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/30 rounded-lg border border-rose-100 dark:border-rose-900/50 space-y-2.5 transition-all">
            <span className="text-xs font-semibold text-rose-900 dark:text-rose-200 block">
              Which correction step(s) had issues?
            </span>
            <div className="grid grid-cols-2 gap-2">
              {availableSteps.map((stepKey) => {
                const info = STEP_LABELS[stepKey] || { label: stepKey, desc: '' };
                const isChecked = dislikedSteps.includes(stepKey);
                return (
                  <label
                    key={stepKey}
                    className={`flex items-start gap-2 p-2 rounded-md border text-xs cursor-pointer select-none transition-colors ${
                      isChecked
                        ? 'bg-rose-100 dark:bg-rose-900/60 border-rose-400 text-rose-900 dark:text-rose-100'
                        : 'bg-white dark:bg-slate-800 border-rose-200/80 dark:border-rose-900/40 text-slate-700 dark:text-slate-300 hover:border-rose-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleStep(stepKey)}
                      className="mt-0.5 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                    />
                    <div className="leading-tight">
                      <div className="font-medium">{info.label}</div>
                      {info.desc && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {info.desc}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Quick Chips */}
            <div className="pt-1">
              <span className="text-[11px] text-rose-800 dark:text-rose-300 font-medium block mb-1.5">
                Quick issue tags:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleChipClick(chip)}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Optional Comment Input */}
        {rating && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                Comments / Observations
              </label>
              <span className="text-[11px] text-slate-400">Optional</span>
            </div>
            <textarea
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                setSubmitted(false);
              }}
              rows={2}
              placeholder={
                rating === 'thumbs_down'
                  ? 'e.g. over-smoothed text around signatures, contrast too aggressive on thermal receipts...'
                  : 'e.g. sharp characters, noise eliminated cleanly...'
              }
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>
        )}

        {error && (
          <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
        )}

        {/* Submit Button */}
        {rating && !submitted && (
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors disabled:opacity-50 shadow-sm"
          >
            {submitting ? 'Saving Feedback...' : 'Submit Feedback'}
          </button>
        )}
      </form>
    </div>
  );
};
