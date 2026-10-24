import React, { useState, useEffect } from 'react';
import { PresetItem, SettingSuggestion, SettingsData } from '../types';
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
  Layers,
  FileText,
  Sparkles,
  Check,
  ArrowRight,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [activePresetId, setActivePresetId] = useState<string>('invoice');
  const [suggestions, setSuggestions] = useState<SettingSuggestion[]>([]);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedMap, setAppliedMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savingPreset, setSavingPreset] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [presetSuccess, setPresetSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [data, presetsData, suggestionsData] = await Promise.all([
        settingsApi.get(),
        settingsApi.getPresets(),
        settingsApi.getSuggestions(),
      ]);
      setSettings(data);
      setPresets(presetsData);
      setSuggestions(suggestionsData);
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

  const handleApplySuggestion = async (sugg: SettingSuggestion) => {
    setApplyingId(sugg.id);
    setError(null);
    try {
      await settingsApi.applySuggestion({
        suggestion_id: sugg.id,
        parameters: sugg.parameters,
        target_type: sugg.target_type,
        preset_id: sugg.preset_id,
      });
      setAppliedMap((prev) => ({ ...prev, [sugg.id]: true }));
      // Refresh configurations to show applied values
      const [data, presetsData, suggestionsData] = await Promise.all([
        settingsApi.get(),
        settingsApi.getPresets(),
        settingsApi.getSuggestions(),
      ]);
      setSettings(data);
      setPresets(presetsData);
      setSuggestions(suggestionsData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError('Failed to apply suggestion.');
    } finally {
      setApplyingId(null);
    }
  };

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

      {/* Section: Adaptive Feedback-Driven Suggestions */}
      {suggestions.length > 0 && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/70 dark:from-indigo-950/40 dark:via-slate-900 dark:to-purple-950/30 border border-indigo-200/80 dark:border-indigo-900/50 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  Adaptive Parameter Suggestions
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-bold">
                    Feedback Driven
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Automated calibrations synthesized from operator ratings, defect statistics, and failed scans
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {suggestions.map((sugg) => {
              const isApplied = appliedMap[sugg.id];
              const isApplying = applyingId === sugg.id;
              return (
                <div
                  key={sugg.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isApplied
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                      : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase font-mono">
                        {sugg.target_type === 'preset' ? `Preset • ${sugg.preset_id}` : `Config • ${sugg.category}`}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase font-mono ${
                          sugg.severity === 'recommended'
                            ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {sugg.severity}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {sugg.title}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {sugg.description}
                    </p>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex items-start gap-1">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">Impact:</span>
                      <span>{sugg.impact}</span>
                    </div>

                    {sugg.reason && (
                      <div className="text-[10px] px-2 py-1 rounded bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-mono">
                        Source: {sugg.reason}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 mt-3">
                    <span className="text-[11px] font-mono text-slate-400">
                      {Object.keys(sugg.parameters).length} parameter tweak(s)
                    </span>
                    <button
                      type="button"
                      disabled={isApplied || isApplying}
                      onClick={() => handleApplySuggestion(sugg)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                        isApplied
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 cursor-default'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50'
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Applied
                        </>
                      ) : isApplying ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Applying...
                        </>
                      ) : (
                        <>
                          Apply Suggestion <ArrowRight className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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

      {/* Section 4: Document-Type Presets Calibration Editor */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                Document-Type Presets Editor
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Customize weights, thresholds, and correction chains per document category
            </p>
          </div>

          {presetSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-300 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Preset updated successfully!
            </div>
          )}
        </div>

        {/* Preset Tabs */}
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => {
            const isActive = p.id === activePresetId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePresetId(p.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Preset Configuration */}
        {(() => {
          const currentPreset = presets.find((p) => p.id === activePresetId);
          if (!currentPreset) return null;

          const handlePresetWeightChange = (key: string, val: number) => {
            setPresets((prev) =>
              prev.map((p) =>
                p.id === activePresetId
                  ? { ...p, weights: { ...p.weights, [key]: val } }
                  : p
              )
            );
          };

          const handlePresetCorrectionToggle = (key: string, val: boolean) => {
            setPresets((prev) =>
              prev.map((p) =>
                p.id === activePresetId
                  ? { ...p, corrections: { ...p.corrections, [key]: val } }
                  : p
              )
            );
          };

          const handleSavePreset = async () => {
            setSavingPreset(true);
            setPresetSuccess(false);
            try {
              await settingsApi.updatePreset(activePresetId, currentPreset);
              setPresetSuccess(true);
              setTimeout(() => setPresetSuccess(false), 3000);
            } catch (err: any) {
              console.error(err);
            } finally {
              setSavingPreset(false);
            }
          };

          const presetTotalWeight = Object.values(currentPreset.weights || {}).reduce((a, b) => a + b, 0);

          return (
            <div className="space-y-6 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">{currentPreset.label}: </span>
                  {currentPreset.description}
                </div>
              </div>

              {/* Preset Weights */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Preset Metric Weights (Sum: {presetTotalWeight.toFixed(2)})
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(currentPreset.weights || {}).map(([metric, weight]) => (
                    <div
                      key={metric}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2"
                    >
                      <div className="flex justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 capitalize">
                        <span>{metric}</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">
                          {(weight as number).toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="0.5"
                        step="0.05"
                        value={weight as number}
                        onChange={(e) =>
                          handlePresetWeightChange(metric, parseFloat(e.target.value))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Preset Correction Chain */}
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block mb-3">
                  Recommended Pipeline Chain for {currentPreset.label}
                </span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: 'deskew_enabled', label: 'Deskew' },
                    { key: 'illumination_enabled', label: 'Illumination & Shadows' },
                    { key: 'denoise_enabled', label: 'Denoising' },
                    { key: 'sharpen_enabled', label: 'Sharpening' },
                    { key: 'autocrop_enabled', label: 'Auto-Crop' },
                    { key: 'ocr_binarization', label: 'OCR Binarization' },
                  ].map(({ key, label }) => {
                    const checked = !!(currentPreset.corrections as any)?.[key];
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
                            handlePresetCorrectionToggle(key, e.target.checked)
                          }
                          className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Save Preset Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSavePreset}
                  disabled={savingPreset}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {savingPreset ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving Preset...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save '{currentPreset.label}' Configuration
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

