import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { AlertDrawer } from './components/AlertDrawer';
import { UploadPage } from './pages/UploadPage';
import { ResultPage } from './pages/ResultPage';
import { BatchResultsPage } from './pages/BatchResultsPage';
import { HistoryPage } from './pages/HistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { alertsApi } from './api/client';
import { AlertItem } from './types';
import { Sparkles, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('upload');
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | undefined>(undefined);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState<boolean>(false);

  // Poll alerts
  const fetchAlerts = async () => {
    try {
      const data = await alertsApi.list();
      setAlerts(data);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const unreadAlertCount = alerts.filter((a) => !a.read).length;

  const handleMarkAlertRead = async (id: number) => {
    try {
      await alertsApi.markRead(id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAlertsRead = async () => {
    try {
      await alertsApi.markAllRead();
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadSuccess = (docId: string, isBatch: boolean, batchId?: string) => {
    fetchAlerts();
    if (isBatch && batchId) {
      setActiveBatchId(batchId);
      setActiveTab('batch');
    } else {
      setActiveDocId(docId);
      setActiveTab('result');
    }
  };

  const handleSelectDocument = (docId: string) => {
    setActiveDocId(docId);
    setActiveTab('result');
  };

  const handleViewBatch = (batchId: string) => {
    setActiveBatchId(batchId);
    setActiveTab('batch');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'result') {
            setActiveDocId(null);
          }
        }}
        unreadAlertCount={unreadAlertCount}
        onOpenAlerts={() => setIsAlertDrawerOpen(true)}
      />

      <main className="flex-1 pb-12">
        {activeTab === 'upload' && (
          <UploadPage onUploadSuccess={handleUploadSuccess} />
        )}

        {activeTab === 'result' && activeDocId && (
          <ResultPage
            documentId={activeDocId}
            onBack={() => setActiveTab('upload')}
            onViewBatch={handleViewBatch}
          />
        )}

        {activeTab === 'batch' && (
          <BatchResultsPage
            batchId={activeBatchId}
            onSelectDocument={handleSelectDocument}
            onGoToUpload={() => setActiveTab('upload')}
          />
        )}

        {activeTab === 'history' && (
          <HistoryPage onSelectDocument={handleSelectDocument} />
        )}

        {activeTab === 'analytics' && <AnalyticsPage />}

        {activeTab === 'settings' && <SettingsPage />}
      </main>

      {/* Alert Drawer */}
      <AlertDrawer
        isOpen={isAlertDrawerOpen}
        onClose={() => setIsAlertDrawerOpen(false)}
        alerts={alerts}
        onMarkRead={handleMarkAlertRead}
        onMarkAllRead={handleMarkAllAlertsRead}
        onSelectDocument={handleSelectDocument}
      />

      {/* Global Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">DocuQuality</span>
            <span>— Document Image Quality Assessment & Auto-Correction</span>
          </div>
          <div>
            Built with FastAPI, OpenCV, scikit-image, PyMuPDF & React
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
