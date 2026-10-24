import React, { useState, useEffect } from 'react';
import { DocumentSummary } from '../types';
import { documentApi } from '../api/client';
import {
  Layers,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  ArrowRight,
  Loader2,
  FileText,
  Search,
} from 'lucide-react';

interface BatchResultsPageProps {
  batchId?: string;
  onSelectDocument: (docId: string) => void;
  onGoToUpload: () => void;
}

export const BatchResultsPage: React.FC<BatchResultsPageProps> = ({
  batchId,
  onSelectDocument,
  onGoToUpload,
}) => {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'improvement' | 'name'>('improvement');
  const [search, setSearch] = useState<string>('');

  const fetchBatch = async () => {
    setLoading(true);
    try {
      const data = await documentApi.list({
        batch_id: batchId,
        limit: 100,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setDocuments(data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatch();
  }, [batchId, statusFilter]);

  const filteredDocs = documents
    .filter((d) => d.filename.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'score') return (b.score_after ?? 0) - (a.score_after ?? 0);
      if (sortBy === 'improvement') return (b.improvement ?? 0) - (a.improvement ?? 0);
      return a.filename.localeCompare(b.filename);
    });

  const getStatusBadge = (classification?: string) => {
    switch (classification) {
      case 'Pass':
        return {
          icon: CheckCircle2,
          bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        };
      case 'Needs Correction':
        return {
          icon: AlertTriangle,
          bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        };
      case 'Fail':
        return {
          icon: XCircle,
          bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800',
        };
      default:
        return {
          icon: CheckCircle2,
          bg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              Batch Processing Results
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {batchId ? `Batch ID: ${batchId}` : 'Viewing all recently processed batch documents'}
          </p>
        </div>

        {/* Batch Actions */}
        <div className="flex items-center gap-2.5">
          {batchId && (
            <a
              href={documentApi.getBatchZipUrl(batchId)}
              download
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download All as ZIP
            </a>
          )}
          <button
            onClick={onGoToUpload}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
          >
            Upload New Batch
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search document names..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filter and Sort Tabs */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Status filter pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
            {['all', 'Pass', 'Needs Correction', 'Fail'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Sort Select */}
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-hidden"
          >
            <option value="improvement">Sort: Highest Improvement</option>
            <option value="score">Sort: Highest Score</option>
            <option value="name">Sort: Filename</option>
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-xs font-medium text-slate-500 mt-2">Loading batch results...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
            No Documents Found
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search or status filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const badge = getStatusBadge(doc.classification);
            const StatusIcon = badge.icon;
            const delta = doc.improvement ?? 0;

            return (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc.id)}
                className="group p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail & Score Header */}
                  <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-slate-950 mb-3 border border-slate-200 dark:border-slate-800">
                    <img
                      src={doc.thumbnail_url}
                      alt={doc.filename}
                      className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-300"
                    />

                    {/* Status Pill Badge */}
                    <div className="absolute top-2 left-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md shadow-xs ${badge.bg}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {doc.classification}
                      </span>
                    </div>

                    {/* Score Tag */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                      {doc.score_before !== undefined && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900/90 text-rose-300 border border-slate-700">
                          {Math.round(doc.score_before)}
                        </span>
                      )}
                      <span>→</span>
                      {doc.score_after !== undefined && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-800">
                          {Math.round(doc.score_after)} pts
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Document Title & Meta */}
                  <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {doc.filename}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span className="uppercase font-mono">{doc.file_type}</span>
                    {doc.page_no > 1 && <span>• Page {doc.page_no}</span>}
                    <span>• {new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>

                  {/* Top Defects Tags */}
                  {doc.top_defects && doc.top_defects.length > 0 && (
                    <div className="mt-2.5 flex items-center gap-1 flex-wrap">
                      {doc.top_defects.map((def, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        >
                          {def}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  {delta !== undefined && (
                    <span
                      className={`text-xs font-semibold flex items-center gap-1 ${
                        delta > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      +{delta.toFixed(1)} pts improvement
                    </span>
                  )}

                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Inspect
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
