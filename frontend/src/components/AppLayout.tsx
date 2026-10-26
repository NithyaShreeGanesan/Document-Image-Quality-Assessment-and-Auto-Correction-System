import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from './Navbar';
import { AlertDrawer } from './AlertDrawer';
import { alertsApi } from '../api/client';
import { AlertItem } from '../types';
import { ShieldCheck } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState<boolean>(false);

  // Derive activeTab from current URL pathname
  const getActiveTab = (pathname: string): string => {
    if (pathname.includes('/app/batch')) return 'batch';
    if (pathname.includes('/app/history')) return 'history';
    if (pathname.includes('/app/analytics')) return 'analytics';
    if (pathname.includes('/app/settings')) return 'settings';
    if (pathname.includes('/app/results') || pathname.includes('/app/result')) return 'result';
    return 'upload';
  };

  const activeTab = getActiveTab(location.pathname);

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

  const handleSelectTab = (tab: string) => {
    if (tab === 'upload') navigate('/app/upload');
    else if (tab === 'batch') navigate('/app/batch');
    else if (tab === 'history') navigate('/app/history');
    else if (tab === 'analytics') navigate('/app/analytics');
    else if (tab === 'settings') navigate('/app/settings');
    else navigate('/app/upload');
  };

  const handleSelectDocument = (docId: string) => {
    setIsAlertDrawerOpen(false);
    navigate(`/app/results/${docId}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        unreadAlertCount={unreadAlertCount}
        onOpenAlerts={() => setIsAlertDrawerOpen(true)}
      />

      <main className="flex-1 pb-12">
        <Outlet />
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

      {/* Global App Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">DocuQuality</span>
            <span>— Document Image Quality Assessment and Auto-Correction System</span>
          </div>
          <div>
            Built with FastAPI, OpenCV, scikit-image, PyMuPDF & React
          </div>
        </div>
      </footer>
    </div>
  );
};
