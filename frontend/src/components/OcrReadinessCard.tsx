import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  TrendingUp,
  AlertCircle,
  FileCode2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

interface OcrReadinessCardProps {
  confidenceBefore?: number;
  confidenceAfter?: number;
  wordsBefore?: number;
  wordsAfter?: number;
  wordsRecovered?: number;
  textBefore?: string;
  textAfter?: string;
  engine?: string;
  message?: string;
}

export const OcrReadinessCard: React.FC<OcrReadinessCardProps> = ({
  confidenceBefore = 0,
  confidenceAfter = 0,
  wordsBefore = 0,
  wordsAfter = 0,
  wordsRecovered = 0,
  textBefore,
  textAfter,
  engine = 'Tesseract OCR',
  message,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const deltaConf = Math.round((confidenceAfter - confidenceBefore) * 10) / 10;
  const isFallback = engine.toLowerCase().includes('heuristic') || engine.toLowerCase().includes('fallback') || !engine;

  const handleCopy = () => {
    if (!textAfter && !textBefore) return;
    navigator.clipboard.writeText(textAfter || textBefore || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Compute simple word-level differences for highlighting
  const renderHighlightedText = (text: string, referenceText: string, isCorrected: boolean) => {
    if (!text) {
      return (
        <span className="text-slate-400 italic">No text extracted.</span>
      );
    }

    const refWords = new Set(
      referenceText
        ? referenceText.toLowerCase().split(/\s+/).map((w) => w.replace(/[^\w]/g, ''))
        : []
    );

    const tokens = text.split(/(\s+)/);

    return tokens.map((token, idx) => {
      if (/^\s+$/.test(token)) return token; // preserve whitespace
      const cleanToken = token.toLowerCase().replace(/[^\w]/g, '');

      // In corrected view: highlight recovered words that weren't in before
      if (isCorrected && cleanToken && !refWords.has(cleanToken)) {
        return (
          <span
            key={idx}
            className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200 font-semibold px-1 py-0.5 rounded"
            title="Recovered word"
          >
            {token}
          </span>
        );
      }
      return <span key={idx}>{token}</span>;
    });
  };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <FileCode2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                OCR Accuracy & Text Extraction Proof
              </h3>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {engine}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Measure recognition confidence and text recovery across original vs. corrected document
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={!textAfter && !textBefore}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                Copied Text!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Extracted Text
              </>
            )}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Tesseract missing or graceful fallback banner */}
      {message && (
        <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">OCR Status: </span>
            {message}
          </div>
        </div>
      )}

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Confidence Before */}
        <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Confidence (Before)
          </span>
          <span className="font-display font-extrabold text-xl text-slate-700 dark:text-slate-300">
            {confidenceBefore.toFixed(1)}%
          </span>
          <p className="text-[10px] text-slate-400 mt-0.5">{wordsBefore} words detected</p>
        </div>

        {/* Confidence After */}
        <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block mb-1">
            Confidence (After)
          </span>
          <span className="font-display font-extrabold text-xl text-emerald-600 dark:text-emerald-400">
            {confidenceAfter.toFixed(1)}%
          </span>
          <p className="text-[10px] text-slate-400 mt-0.5">{wordsAfter} words detected</p>
        </div>

        {/* Confidence Gain */}
        <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Confidence Gain
          </span>
          <span
            className={`font-display font-extrabold text-xl flex items-center gap-1 ${
              deltaConf >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            {deltaConf >= 0 ? `+${deltaConf.toFixed(1)}%` : `${deltaConf.toFixed(1)}%`}
          </span>
          <p className="text-[10px] text-slate-400 mt-0.5">accuracy improvement</p>
        </div>

        {/* Words Recovered */}
        <div className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block mb-1">
            Words Recovered
          </span>
          <span className="font-display font-extrabold text-xl text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
            <Sparkles className="w-4 h-4" />
            +{wordsRecovered}
          </span>
          <p className="text-[10px] text-slate-400 mt-0.5">additional legible tokens</p>
        </div>
      </div>

      {/* Side-by-side Extracted Text View with Differences Highlighted */}
      {isExpanded && (
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Side-by-Side Extracted Text View</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Green highlight indicates recovered or clarified words
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Left: Original Text */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 font-mono text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap select-text">
              <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-400 mb-1.5 pb-1 border-b border-slate-200 dark:border-slate-800">
                Original Capture Text
              </div>
              {textBefore ? (
                renderHighlightedText(textBefore, textAfter || '', false)
              ) : (
                <span className="text-slate-400 italic">No text recognized in original image.</span>
              )}
            </div>

            {/* Right: Corrected Text */}
            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap select-text">
              <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1.5 pb-1 border-b border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
                <span>Corrected OCR Output</span>
                <span className="text-[9px] font-semibold text-emerald-600 uppercase">Recovered</span>
              </div>
              {textAfter ? (
                renderHighlightedText(textAfter, textBefore || '', true)
              ) : (
                <span className="text-slate-400 italic">No text extracted from corrected image.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
