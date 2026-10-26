import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';

export const SignInPage: React.FC = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If redirected from a protected page, return there upon successful login
  const from = (location.state as any)?.from?.pathname || '/app/upload';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(cleanEmail, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      const detail =
        err?.response?.data?.detail ||
        (typeof err?.response?.data === 'string' ? err?.response?.data : null) ||
        'Invalid email or password. Please try again.';
      setErrorMessage(detail);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 text-slate-100">
      {/* Background glowing ambient elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-[120px] pointer-events-none" />

      {/* Top Bar with Logo & Theme Toggle */}
      <header className="absolute top-0 left-0 right-0 max-w-7xl mx-auto px-6 py-4 flex items-center justify-between z-10">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-all">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <span className="font-display font-bold text-xl text-white tracking-tight">
              Docu<span className="text-indigo-400">Quality</span>
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all backdrop-blur-md"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-400" />}
          </button>
        </div>
      </header>

      {/* Centered Sign In Card */}
      <div className="w-full max-w-md relative z-10 pt-16 pb-8">
        <div className="bg-white/10 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/40">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Welcome Back</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              Sign In to DocuQuality
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2">
              Document Image Quality Assessment & Auto-Correction
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 text-white placeholder-slate-400 text-sm outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 text-white placeholder-slate-400 text-sm outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 active:scale-[0.99] transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Sign Up */}
          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-xs sm:text-sm text-slate-300">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-4 transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home link */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1"
          >
            ← Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
};
