import React, { useState, useEffect } from 'react';
import { DocumentDetail, ReprocessOptions } from '../types';
import { documentApi } from '../api/client';
import { MetricGauge } from '../components/MetricGauge';
import { ImageSlider } from '../components/ImageSlider';
import { RadarMetrics } from '../components/RadarMetrics';
import { DefectBreakdown } from '../components/DefectBreakdown';
import { CorrectionsList } from '../components/CorrectionsList';
import { ReprocessModal } from '../components/ReprocessModal';
import { OcrReadinessCard } from '../components/OcrReadinessCard';
import { RescanGuidanceCard } from '../components/RescanGuidanceCard';
import {
  Download,
  Sliders,
  ArrowLeft,
  Calendar,
  FileCheck2,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Loader2,
  Layers,
  FileText,
  FileDown,
  Archive,
} from 'lucide-react';

interface ResultPageProps {
  documentId: string;
  onBack: () => void;
  onViewBatch?: (batchId: string) => void;
}

export const ResultPage: React.FC<ResultPageProps> = ({
  documentId,
  onBack,
  onViewBatch,
}) => {
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isReprocessOpen, setIsReprocessOpen] = useState<boolean>(false);
  const [downloadDropdown, setDownloadDropdown] = useState<boolean>(false);

  const fetchDocument = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await documentApi.get(documentId);
      setDoc(data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to load document details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  const handleReprocess = async (options: ReprocessOptions) => {
    try {
      const updated = await documentApi.reprocess(documentId, options);
      setDoc(updated);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Loading Document Analysis & Auto-Corrections...
        </p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
          <XCircle className="w-6 h-6" />
        </div>
        <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
          Document Not Found
        </h3>
        <p className="text-sm text-slate-500">{error || 'Unable to retrieve document.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-lg text-xs font-semibold"
        >
          Return to Upload
        </button>
      </div>
    );
  }

  const beforeScore = doc.before_assessment?.overall_score ?? 0;
  const afterScore = doc.after_assessment?.overall_score ?? beforeScore;
  const delta = doc.after_assessment?.improvement_delta ?? Math.round((afterScore - beforeScore) * 10) / 10;
  const classification = doc.after_assessment?.classification || (afterScore >= 75 ? 'Pass' : afterScore >= 45 ? 'Needs Correction' : 'Fail');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onBack}
              className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mr-1"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white truncate max-w-md">
              {doc.filename}
            </h2>
            {doc.page_no > 1 && (
              <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Page {doc.page_no}
              </span>
            )}
            {doc.batch_id && onViewBatch && (
              <button
                onClick={() => onViewBatch(doc.batch_id!)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Layers className="w-3.5 h-3.5" />
                View Batch
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(doc.created_at).toLocaleDateString()} at{' '}
              {new Date(doc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span>•</span>
            <span className="uppercase font-mono text-[11px]">{doc.file_type}</span>
            <span>•</span>
            <span className="capitalize">{doc.status.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Action Buttons: Download & Reprocess */}
        <div className="flex items-center gap-2.5 relative">
          <button
            onClick={() => setIsReprocessOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            Fine-Tune Corrections
          </button>

          {/* Download Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDownloadDropdown(!downloadDropdown)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>

            {downloadDropdown && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-30 py-1 text-xs animate-in fade-in duration-150">
                <a
                  href={documentApi.getDownloadUrl(doc.id, 'corrected')}
                  download
                  onClick={() => setDownloadDropdown(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                >
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  Corrected Output (PNG)
                </a>
                <a
                  href={documentApi.getDownloadUrl(doc.id, 'original')}
                  download
                  onClick={() => setDownloadDropdown(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <FileText className="w-4 h-4 text-slate-400" />
                  Original Untouched File
                </a>
                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                <a
                  href={documentApi.getDownloadUrl(doc.id, 'zip')}
                  download
                  onClick={() => setDownloadDropdown(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <Archive className="w-4 h-4 text-indigo-500" />
                  Complete Bundle (ZIP)
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Visual Slider & Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Before/After Image Comparison Slider */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="mb-3">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
              Visual Restoration Inspection
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive split comparison between original capture and OCR-ready result
            </p>
          </div>

          <ImageSlider
            originalUrl={doc.original_url}
            correctedUrl={doc.corrected_url}
            altText={doc.filename}
            scoreBefore={beforeScore}
            scoreAfter={afterScore}
          />
        </div>

        {/* Right 4 Cols: Quality Score Gauge & Metrics Radar */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Quality Score Gauges Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white mb-1">
              Quality Assessment Score
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Objective weighted score (0-100)
            </p>

            <div className="grid grid-cols-2 gap-2 divide-x divide-slate-100 dark:divide-slate-800">
              <MetricGauge
                score={beforeScore}
                classification={doc.before_assessment?.classification}
                size="sm"
                label="Initial Score"
                subtext="Before correction"
              />
              <MetricGauge
                score={afterScore}
                classification={classification}
                delta={delta}
                size="sm"
                label="Restored Score"
                subtext="After targeted fix"
              />
            </div>

            {/* OCR Readiness Card */}
            {(doc.ocr_confidence_before !== undefined || doc.ocr_confidence_after !== undefined) && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FileCode2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    OCR Extraction Confidence
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                    {doc.ocr_confidence_after ? `${doc.ocr_confidence_after}%` : 'N/A'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span>Before: {doc.ocr_confidence_before ?? 'N/A'}%</span>
                  <span>→</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    After: {doc.ocr_confidence_after ?? 'N/A'}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 6-Metric Radar Profile */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex-1">
            <RadarMetrics
              before={doc.before_assessment}
              after={doc.after_assessment}
            />
          </div>
        </div>
      </div>

      {/* Rescan Guidance & Defect Diagnosis Panel */}
      <RescanGuidanceCard
        guidance={doc.rescan_guidance || doc.before_assessment?.rescan_guidance || []}
        classification={classification}
        rescanRecommended={doc.rescan_recommended}
        filename={doc.filename}
      />

      {/* OCR Accuracy & Extraction Proof Card */}
      <OcrReadinessCard
        confidenceBefore={doc.ocr_confidence_before ?? 0}
        confidenceAfter={doc.ocr_confidence_after ?? 0}
        wordsBefore={doc.ocr_word_count_before ?? 0}
        wordsAfter={doc.ocr_word_count_after ?? 0}
        wordsRecovered={doc.ocr_words_recovered ?? 0}
        textBefore={doc.ocr_text_before ?? ''}
        textAfter={doc.ocr_text_after ?? ''}
        engine={doc.ocr_engine ?? 'Tesseract OCR'}
        message={doc.ocr_message ?? undefined}
      />

      {/* Bottom Row: Defect Diagnostics & Corrections Applied */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Defect Diagnostics Breakdown */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          {doc.before_assessment?.defects ? (
            <DefectBreakdown
              defects={doc.before_assessment.defects}
              title="Pre-Correction Defect Diagnostics"
            />
          ) : (
            <p className="text-xs text-slate-400">No defect breakdown available.</p>
          )}
        </div>

        {/* Applied Corrections List */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <CorrectionsList corrections={doc.applied_corrections} />
        </div>
      </div>

      {/* Reprocess Fine-Tuning Modal */}
      <ReprocessModal
        isOpen={isReprocessOpen}
        onClose={() => setIsReprocessOpen(false)}
        onReprocess={handleReprocess}
      />
    </div>
  );
};
