import React from 'react';
import { AlertItem } from '../types';
import {
  X,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCheck,
  ExternalLink,
  BellOff,
} from 'lucide-react';

interface AlertDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AlertItem[];
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onSelectDocument: (docId: string) => void;
}

export const AlertDrawer: React.FC<AlertDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  onMarkRead,
  onMarkAllRead,
  onSelectDocument,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col transform animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
              Quality Alerts & Warnings
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Low-quality captures flagged for re-scanning
            </p>
          </div>

          <div className="flex items-center gap-2">
            {alerts.some((a) => !a.read) && (
              <button
                onClick={onMarkAllRead}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {alerts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500">
              <BellOff className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">No alerts right now</p>
              <p className="text-xs text-slate-400 mt-1">
                When a document fails quality thresholds (score &lt; 45), alerts will appear here.
              </p>
            </div>
          ) : (
            alerts.map((alert) => {
              const isCrit = alert.severity === 'critical';
              const Icon = isCrit ? AlertOctagon : alert.severity === 'warning' ? AlertTriangle : Info;

              return (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    !alert.read
                      ? isCrit
                        ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 shadow-xs'
                        : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 shadow-xs'
                      : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-70'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isCrit
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                          {alert.severity}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5 leading-snug">
                        {alert.message}
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        {alert.document_id && (
                          <button
                            onClick={() => {
                              onSelectDocument(alert.document_id!);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Inspect Document
                          </button>
                        )}

                        {!alert.read && (
                          <button
                            onClick={() => onMarkRead(alert.id)}
                            className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 ml-auto"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
