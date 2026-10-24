import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  UploadCloud,
  FileText,
  FileCheck2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Loader2,
  Trash2,
  CheckCircle2,
  Layers,
  Zap,
} from 'lucide-react';
import { documentApi } from '../api/client';

interface UploadPageProps {
  onUploadSuccess: (docId: string, isBatch: boolean, batchId?: string) => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({ onUploadSuccess }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1); // 1: Upload, 2: Assess, 3: Correct, 4: Deliver

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setErrorMessage(null);
    if (acceptedFiles.length === 0) return;

    // Validate up to 50 files
    setSelectedFiles((prev) => {
      const combined = [...prev, ...acceptedFiles];
      if (combined.length > 50) {
        setErrorMessage('A maximum of 50 files can be uploaded per batch.');
        return combined.slice(0, 50);
      }
      return combined;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/tiff': ['.tif', '.tiff'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 25 * 1024 * 1024, // 25 MB
  });

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setErrorMessage(null);
  };

  const handleProcess = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setUploadProgress(15);
    setActiveStep(1); // Upload
    setErrorMessage(null);

    try {
      // Step 1: Uploading
      setActiveStep(1);
      setUploadProgress(40);

      // Transition to Step 2: Assess
      setTimeout(() => setActiveStep(2), 600);
      // Transition to Step 3: Correct
      setTimeout(() => setActiveStep(3), 1200);

      const result = await documentApi.upload(selectedFiles, (pct) => {
        setUploadProgress(Math.min(90, Math.max(20, pct)));
      });

      // Step 4: Deliver
      setActiveStep(4);
      setUploadProgress(100);

      setTimeout(() => {
        if (result.document_ids && result.document_ids.length > 0) {
          const isBatch = result.count > 1;
          onUploadSuccess(result.document_ids[0], isBatch, result.batch_id);
        }
      }, 700);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.response?.data?.detail || 'Failed to process document. Please check the file and try again.'
      );
      setIsUploading(false);
      setActiveStep(1);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
          <Sparkles className="w-3.5 h-3.5" />
          Automated Computer Vision Engine
        </div>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight">
          Assess & Auto-Correct Document Quality
        </h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-400">
          Upload mobile captures or flatbed scans to diagnose blur, skew, shadows, and noise.
          Our targeted engine applies non-destructive corrections to deliver OCR-ready perfection.
        </p>
      </div>

      {/* Pipeline Stepper */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { step: 1, label: 'Upload', desc: 'JPEG, PNG, TIFF, PDF' },
            { step: 2, label: 'Assess', desc: '6 Objective Metrics' },
            { step: 3, label: 'Correct', desc: 'Targeted Restoration' },
            { step: 4, label: 'Deliver', desc: 'OCR-Ready Output' },
          ].map((item) => {
            const isCurrent = isUploading && activeStep === item.step;
            const isCompleted = isUploading && activeStep > item.step;
            return (
              <div
                key={item.step}
                className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
                  isCurrent
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                    : isCompleted
                    ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCurrent
                      ? 'bg-indigo-600 text-white animate-pulse'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : item.step}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {item.label}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dropzone Upload Area */}
      <div
        {...getRootProps()}
        className={`relative rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all cursor-pointer ${
          isDragActive
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-white/70 dark:bg-slate-900/70 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input {...getInputProps()} />

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/10">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div>
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              {isDragActive ? 'Drop your documents here' : 'Drag & drop document images or PDF'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Supports single or batch upload up to 50 files (max 25 MB each). Multi-page PDFs are automatically split and processed page-by-page.
            </p>
          </div>

          {/* Format Badges */}
          <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
            {['JPEG', 'PNG', 'TIFF', 'PDF (Multi-page)'].map((fmt) => (
              <span
                key={fmt}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              >
                {fmt}
              </span>
            ))}
          </div>

          <button
            type="button"
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all inline-flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            Browse Files from Device
          </button>
        </div>
      </div>

      {/* 1-Click Demo Samples Grid */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white">
              Instant 1-Click Demo Scans
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">
            Click to test defect diagnosis and auto-restoration
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {[
            { file: 'sample_2_skewed_invoice.png', label: 'Skewed Invoice', badge: 'Tilt ~4.8°', color: 'border-amber-300 dark:border-amber-800' },
            { file: 'sample_3_blurred_contract.png', label: 'Blurred Contract', badge: 'Motion Blur', color: 'border-rose-300 dark:border-rose-800' },
            { file: 'sample_4_shadowed_invoice.png', label: 'Shadowed Invoice', badge: 'Phone Shadow', color: 'border-amber-300 dark:border-amber-800' },
            { file: 'sample_5_noisy_contract.png', label: 'Noisy Contract', badge: 'Sensor Grain', color: 'border-blue-300 dark:border-blue-800' },
            { file: 'sample_6_severely_degraded_fail.png', label: 'Degraded Scan', badge: 'Fail / Alert', color: 'border-rose-400 dark:border-rose-900' },
            { file: 'sample_7_multipage_packet.pdf', label: 'Multi-Page PDF', badge: '2 Pages', color: 'border-indigo-300 dark:border-indigo-800' },
          ].map((sample) => (
            <button
              key={sample.file}
              disabled={isUploading}
              onClick={async () => {
                setIsUploading(true);
                setUploadProgress(30);
                setActiveStep(2);
                try {
                  const res = await documentApi.processSample(sample.file);
                  setUploadProgress(100);
                  setActiveStep(4);
                  setTimeout(() => {
                    const isBatch = res.count > 1;
                    onUploadSuccess(res.document_ids[0], isBatch, res.batch_id);
                  }, 500);
                } catch (err: any) {
                  setErrorMessage(err.response?.data?.detail || 'Failed to process sample.');
                  setIsUploading(false);
                }
              }}
              className={`p-2.5 rounded-xl border ${sample.color} bg-slate-50/70 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xs transition-all text-left flex flex-col justify-between group disabled:opacity-50`}
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                  {sample.badge}
                </span>
                <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate block mt-0.5">
                  {sample.label}
                </span>
              </div>
              <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 mt-2 flex items-center gap-1">
                Run Test <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-start gap-3 text-rose-800 dark:text-rose-200 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="flex-1">
            <p className="font-semibold">Upload Error</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Selected Files Queue */}
      {selectedFiles.length > 0 && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                Queue ({selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''})
              </h4>
            </div>

            <button
              onClick={clearAll}
              disabled={isUploading}
              className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-medium disabled:opacity-50"
            >
              Clear Queue
            </button>
          </div>

          {/* Files List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
            {selectedFiles.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="p-3 flex items-center justify-between gap-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                {!isUploading && (
                  <button
                    onClick={() => removeFile(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Progress Bar (during upload) */}
          {isUploading && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                  Executing Quality Pipeline (Assess & Auto-Correct)...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Start Processing Action Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleProcess}
              disabled={isUploading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-md shadow-indigo-600/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing Quality...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Assess & Correct ({selectedFiles.length}) Document{selectedFiles.length > 1 ? 's' : ''}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
