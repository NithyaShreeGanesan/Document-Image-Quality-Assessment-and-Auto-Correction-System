import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Upload,
  Layers,
  History,
  BarChart3,
  Settings,
  Bell,
  Sun,
  Moon,
  ShieldCheck,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { healthApi } from '../api/client';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unreadAlertCount: number;
  onOpenAlerts: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  unreadAlertCount,
  onOpenAlerts,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [isRechecking, setIsRechecking] = useState<boolean>(false);

  const checkHealth = async () => {
    try {
      const res = await healthApi.check();
      if (res && res.status === 'ok') {
        setBackendStatus('connected');
      } else {
        setBackendStatus('disconnected');
      }
    } catch (err) {
      setBackendStatus('disconnected');
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRecheck = async () => {
    setIsRechecking(true);
    setBackendStatus('checking');
    await checkHealth();
    setIsRechecking(false);
  };

  const navItems = [
    { id: 'upload', label: 'Upload & Process', icon: Upload },
    { id: 'batch', label: 'Batch Results', icon: Layers },
    { id: 'history', label: 'History', icon: History },
    { id: 'analytics', label: 'Analytics & Trends', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => setActiveTab('upload')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-0.5 shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
            <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-xl text-slate-900 dark:text-white tracking-tight">
                Docu<span className="text-indigo-600 dark:text-indigo-400">Quality</span>
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Document Image Quality Assessment and Auto-Correction System
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Action Icons: Backend Status, Alerts & Theme Toggle */}
        <div className="flex items-center gap-2">
          {/* Backend Connection Indicator */}
          <button
            onClick={handleManualRecheck}
            disabled={isRechecking}
            title={`Backend Status: ${backendStatus}. Click to test connection.`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              backendStatus === 'connected'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                : backendStatus === 'disconnected'
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            }`}
          >
            {backendStatus === 'connected' ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            ) : backendStatus === 'disconnected' ? (
              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            ) : (
              <RefreshCw className={`w-3 h-3 text-amber-500 ${isRechecking ? 'animate-spin' : ''}`} />
            )}
            <span className="hidden sm:inline">Backend:</span>
            <span className="font-semibold capitalize">{backendStatus}</span>
          </button>

          {/* Alerts Bell */}
          <button
            onClick={onOpenAlerts}
            aria-label="View notifications"
            className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadAlertCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                {unreadAlertCount}
              </span>
            )}
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-slate-600 hover:text-slate-900" />
            ) : (
              <Sun className="w-5 h-5 text-amber-400 hover:text-amber-300" />
            )}
          </button>

          {/* User Profile & Logout */}
          {user && (
            <div className="flex items-center gap-2 pl-2 ml-1 border-l border-slate-200 dark:border-slate-800">
              <div
                title={user.email}
                className="flex items-center gap-2 py-1 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-200 font-medium"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold flex items-center justify-center text-[11px] shadow-xs shrink-0">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="hidden sm:inline max-w-[110px] md:max-w-[140px] truncate">
                  {user.full_name}
                </span>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate('/signin');
                }}
                title="Log out"
                className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 transition-all cursor-pointer"
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="md:hidden flex border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 overflow-x-auto py-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 min-w-[80px] flex flex-col items-center py-1.5 px-2 rounded-md text-[11px] font-medium transition-colors ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="truncate">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
