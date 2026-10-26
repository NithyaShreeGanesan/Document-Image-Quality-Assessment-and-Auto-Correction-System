import React, { useState, useEffect } from 'react';
import { DocumentSummary } from '../types';
import { documentApi, resolveApiUrl } from '../api/client';
import {
  History,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Calendar,
} from 'lucide-react';

interface HistoryPageProps {
  onSelectDocument: (docId: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onSelectDocument }) => {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await documentApi.list({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setDocuments(data.items);
      setTotalPages(data.total_pages);
      setTotalCount(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this document from history?')) return;
    setDeletingId(docId);
    try {
      await documentApi.delete(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setTotalCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

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
              <History className="w-4 h-4" />
            </div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              Document Processing History
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Total records: {totalCount} document{totalCount === 1 ? '' : 's'}
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs overflow-x-auto">
          {['all', 'Pass', 'Needs Correction', 'Fail'].map((st) => (
            <button
              key={st}
              onClick={() => { setStatusFilter(st); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                statusFilter === st
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors"
        >
          Search
        </button>
      </form>

      {/* Table of Documents */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            <p className="text-xs font-medium text-slate-500 mt-2">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
              No Documents in History
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Upload your first document to see assessment logs and auto-corrections here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Quality Status</th>
                  <th className="py-3 px-4">Before Score</th>
                  <th className="py-3 px-4">Restored Score</th>
                  <th className="py-3 px-4">Improvement</th>
                  <th className="py-3 px-4">Processed Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {documents.map((doc) => {
                  const badge = getStatusBadge(doc.classification);
                  const StatusIcon = badge.icon;
                  const delta = doc.improvement ?? 0;

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => onSelectDocument(doc.id)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    >
                      {/* Filename & Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={resolveApiUrl(doc.thumbnail_url)}
                            alt={doc.filename}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-900 shrink-0"
                          />
                          <div className="min-w-0 max-w-xs">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                              {doc.filename}
                            </span>
                            <span className="text-[11px] text-slate-400 uppercase font-mono">
                              {doc.file_type} {doc.page_no > 1 && `• Page ${doc.page_no}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {doc.classification}
                        </span>
                      </td>

                      {/* Before Score */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {doc.score_before !== undefined ? Math.round(doc.score_before) : '—'}
                      </td>

                      {/* After Score */}
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {doc.score_after !== undefined ? `${Math.round(doc.score_after)} pts` : '—'}
                      </td>

                      {/* Delta */}
                      <td className="py-3 px-4">
                        {delta > 0 ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="w-3.5 h-3.5" />
                            +{delta.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">0.0</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); onSelectDocument(doc.id); }}
                            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-colors"
                            title="Inspect Details"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, doc.id)}
                            disabled={deletingId === doc.id}
                            className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete Document"
                          >
                            {deletingId === doc.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
