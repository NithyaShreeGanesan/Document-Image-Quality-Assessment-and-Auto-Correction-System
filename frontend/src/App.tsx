import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';

// Pages
import { LandingPage } from './pages/LandingPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { UploadPage } from './pages/UploadPage';
import { ResultPage } from './pages/ResultPage';
import { BatchResultsPage } from './pages/BatchResultsPage';
import { HistoryPage } from './pages/HistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { Loader2 } from 'lucide-react';

// Wrapper for "/" that redirects authenticated users to /app/upload
const LandingPageRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/app/upload" replace />;
  }

  return <LandingPage />;
};

// Wrapper for UploadPage with routing integration
const UploadPageRoute: React.FC = () => {
  const navigate = useNavigate();

  const handleUploadSuccess = (docId: string, isBatch: boolean, batchId?: string) => {
    if (isBatch && batchId) {
      navigate(`/app/batch?batchId=${batchId}`);
    } else {
      navigate(`/app/results/${docId}`);
    }
  };

  return <UploadPage onUploadSuccess={handleUploadSuccess} />;
};

// Wrapper for BatchResultsPage with search params
const BatchResultsPageRoute: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const batchId = searchParams.get('batchId') || undefined;

  return (
    <BatchResultsPage
      batchId={batchId}
      onSelectDocument={(docId) => navigate(`/app/results/${docId}`)}
      onGoToUpload={() => navigate('/app/upload')}
    />
  );
};

// Wrapper for HistoryPage with document selection
const HistoryPageRoute: React.FC = () => {
  const navigate = useNavigate();

  return (
    <HistoryPage onSelectDocument={(docId) => navigate(`/app/results/${docId}`)} />
  );
};

// Wrapper for ResultPage with URL param
const ResultPageRoute: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return <Navigate to="/app/upload" replace />;
  }

  return (
    <ResultPage
      documentId={id}
      onBack={() => navigate('/app/upload')}
      onViewBatch={(batchId) => navigate(`/app/batch?batchId=${batchId}`)}
    />
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPageRoute />} />
            <Route
              path="/signin"
              element={
                <PublicOnlyRoute>
                  <SignInPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicOnlyRoute>
                  <SignUpPage />
                </PublicOnlyRoute>
              }
            />

            {/* Protected App Routes */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/app/upload" replace />} />
              <Route path="upload" element={<UploadPageRoute />} />
              <Route path="batch" element={<BatchResultsPageRoute />} />
              <Route path="history" element={<HistoryPageRoute />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="results/:id" element={<ResultPageRoute />} />
              <Route path="result/:id" element={<ResultPageRoute />} />
              <Route path="result" element={<Navigate to="/app/upload" replace />} />
            </Route>

            {/* Catch-all Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
