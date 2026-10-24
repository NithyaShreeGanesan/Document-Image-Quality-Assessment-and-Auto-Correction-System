import React, { useState, useEffect } from 'react';
import { SettingsData } from '../types';
import { settingsApi } from '../api/client';
import {
  Settings,
  Save,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Scale,
  Wand2,
  ShieldAlert,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await settingsApi.get();
      setSettings(data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaveSuccess(false);
    setError(null);
    try {
      await settingsApi.update(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError('Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleWeightChange = (metric: keyof SettingsData['weights'], val: number) => {
    if (!settings) return;
    setSettings({
      ...settings,
      weights: {
        ...settings.weights,
        [metric]: val,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Loading Quality Thresholds & Parameters...
        </p>
      </div>
    );
  }

  if (!settings) return null;

  const totalWeights = Object.values(settings.weights).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              System Settings & Threshold Tuning
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Calibrate objective quality metric weights, diagnostic thresholds, and default correction pipelines
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving Settings...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Configuration
            </>
          )}
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Settings successfully updated and saved to config.yaml and database!
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Metric Weights */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Quality Metric Weights (Overall Score Formulation)
              </h3>
            </div>
            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md border ${
                Math.abs(totalWeights - 1.0) < 0.05
                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}
            >
              Sum: {totalWeights.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure the relative importance of each metric when computing the combined 0-100 Overall Quality Score.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {[
              { key: 'blur', label: 'Blur & Character Sharpness', min: 0.05, max: 0.50 },
              { key: 'skew', label: 'Orientation & Skew Alignment', min: 0.05, max: 0.40 },
              { key: 'brightness', label: 'Brightness & Illumination Uniformity', min: 0.05, max: 0.40 },
              { key: 'contrast', label: 'Dynamic Range & Contrast', min: 0.05, max: 0.40 },
              { key: 'noise', label: 'Noise & Grain Suppression', min: 0.05, max: 0.40 },
              { key: 'resolution', label: 'Resolution & Pixel DPI', min: 0.05, max: 0.40 },
            ].map(({ key, label, min, max }) => {
              const val = settings.weights[key as keyof SettingsData['weights']];
              return (
                <div key={key} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    <span>{label}</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                      {val.toFixed(2)} ({Math.round(val * 100)}%)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={0.01}
                    value={val}
                    onChange={(e) => handleWeightChange(key as keyof SettingsData['weights'], parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Classification Thresholds */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
              Classification & Re-Scan Thresholds
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define cutoff boundaries for quality grade tiers. Documents scoring below Fail threshold are automatically flagged for re-scanning.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20">
              <label className="block text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                Pass Threshold (Min Score)
              </label>
              <input
                type="number"
                min={50}
                max={95}
                value={settings.classification.pass_score}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    classification: {
                      ...settings.classification,
                      pass_score: parseFloat(e.target.value) || 75,
                    },
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
              />
              <p className="text-[10px] text-slate-500 mt-1">Default: 75.0</p>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20">
              <label className="block text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                Sub-score Pass Min
              </label>
              <input
                type="number"
                min={30}
                max={70}
                value={settings.classification.min_subscore_pass}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    classification: {
                      ...settings.classification,
                      min_subscore_pass: parseFloat(e.target.value) || 50,
                    },
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
              />
              <p className="text-[10px] text-slate-500 mt-1">Default: 50.0</p>
            </div>

            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20">
              <label className="block text-xs font-bold text-rose-800 dark:text-rose-300 mb-1">
                Fail / Re-scan Cutoff
              </label>
              <input
                type="number"
                min={20}
                max={60}
                value={settings.classification.fail_score}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    classification: {
                      ...settings.classification,
                      fail_score: parseFloat(e.target.value) || 45,
                    },
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
              />
              <p className="text-[10px] text-slate-500 mt-1">Default: 45.0</p>
            </div>
          </div>
        </div>

        {/* Section 3: Default Correction Pipeline */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
              Default Auto-Correction Steps
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enable or disable automated correction steps applied during default processing pipelines.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: 'deskew_enabled', label: 'Auto-Deskew' },
              { key: 'illumination_enabled', label: 'Illumination & CLAHE' },
              { key: 'denoise_enabled', label: 'Fast NL-Means Denoise' },
              { key: 'sharpen_enabled', label: 'Adaptive Sharpening' },
              { key: 'autocrop_enabled', label: 'Contour Auto-Crop' },
              { key: 'ocr_binarization', label: 'OCR-Optimized Binarize' },
            ].map(({ key, label }) => {
              const checked = !!settings.corrections[key as keyof SettingsData['corrections']];
              return (
                <label
                  key={key}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {label}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        corrections: {
                          ...settings.corrections,
                          [key]: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500"
                  />
                </label>
              );
            })}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={fetchSettings}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Reset to Loaded
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
};
