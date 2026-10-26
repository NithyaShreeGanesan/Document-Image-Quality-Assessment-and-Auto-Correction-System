import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-400 mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          Verifying your session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const PublicOnlyRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-400 mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          Loading...
        </p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/app/upload" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
