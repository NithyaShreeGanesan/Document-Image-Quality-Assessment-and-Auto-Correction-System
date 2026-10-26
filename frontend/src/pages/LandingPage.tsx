import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  ShieldCheck,
  Upload,
  ArrowRight,
  Play,
  Zap,
  Wand2,
  Lock,
  Cloud,
  FileText,
  Sliders,
  CheckCircle2,
  TrendingUp,
  Clock,
  Layers,
  BarChart3,
  Settings,
  Bell,
  Sun,
  Moon,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Gauge,
  Scan,
  Contrast,
  Activity,
  Maximize2,
  Image as ImageIcon,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'before' | 'after'>('after');
  const [dragOver, setDragOver] = useState(false);

  const handleAction = () => {
    if (isAuthenticated) {
      navigate('/app/upload');
    } else {
      navigate('/signup');
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const qualityMetrics = [
    {
      name: 'Sharpness & Blur',
      method: 'Modified Laplacian variance',
      score: '96/100',
      icon: Gauge,
      description: 'Quantifies edge sharpness and identifies motion or defocus blur across document regions.',
    },
    {
      name: 'Skew & Orientation',
      method: 'Radon & Hough transform',
      score: '0.2° detected',
      icon: Scan,
      description: 'Accurately determines tilt angles and auto-rotates text lines back to horizontal axis.',
    },
    {
      name: 'Brightness & Uniformity',
      method: 'Luminance histogram analysis',
      score: 'Balanced',
      icon: Sun,
      description: 'Balances uneven shadows, phone flash glare, and backlighting gradient variations.',
    },
    {
      name: 'Dynamic Contrast',
      method: 'Local standard deviation & CLAHE',
      score: 'High fidelity',
      icon: Contrast,
      description: 'Maximizes ink-to-paper separation to prevent characters from bleeding or fading.',
    },
    {
      name: 'Noise & Grain',
      method: 'High-frequency wave estimation',
      score: 'Filtered',
      icon: Activity,
      description: 'Removes ISO sensor noise, compression artifacts, and scanning scanner grit.',
    },
    {
      name: 'Resolution & OCR Readiness',
      method: 'DPI density & stroke thickness',
      score: '300 DPI eq.',
      icon: Maximize2,
      description: 'Validates that minimum character stroke size meets strict OCR recognition thresholds.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {/* ---------------------------------------------------- */}
      {/* 1. TOP NAVBAR */}
      {/* ---------------------------------------------------- */}
      <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 p-0.5 shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <span className="font-display font-extrabold text-2xl text-slate-900 dark:text-white tracking-tight">
              Docu<span className="text-indigo-600 dark:text-indigo-400">Quality</span>
            </span>
          </Link>

          {/* Nav Links (smooth scroll, no Pricing link) */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => scrollToSection('hero')}
              className="px-4 py-1.5 rounded-full text-sm font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="px-3.5 py-1.5 rounded-full text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="px-3.5 py-1.5 rounded-full text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('dashboard')}
              className="px-3.5 py-1.5 rounded-full text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="px-3.5 py-1.5 rounded-full text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              About
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-slate-600" />
              ) : (
                <Sun className="w-5 h-5 text-amber-400" />
              )}
            </button>

            {isAuthenticated ? (
              <Link
                to="/app/upload"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Open App</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/signin"
                  className="hidden sm:inline-flex px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------- */}
      {/* 2. HERO SECTION */}
      {/* ---------------------------------------------------- */}
      <section
        id="hero"
        className="relative pt-12 pb-20 lg:pt-16 lg:pb-28 overflow-hidden bg-gradient-to-b from-indigo-50/60 via-purple-50/30 to-slate-50 dark:from-indigo-950/40 dark:via-slate-950 dark:to-slate-950"
      >
        {/* Glow Spheres */}
        <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-40 right-10 w-[450px] h-[450px] bg-violet-500/10 dark:bg-violet-500/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Hero Left Text (5 cols) */}
            <div className="lg:col-span-5 text-left space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-100/80 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>AI-Powered Document Enhancement</span>
              </div>

              {/* Main Heading */}
              <div className="space-y-2">
                <h2 className="text-4xl sm:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tight">
                  Docu<span className="text-indigo-600 dark:text-indigo-400">Quality</span>
                </h2>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-800 dark:text-slate-200 leading-snug">
                  Document Image Quality Assessment and Auto-Correction System
                </h1>
              </div>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                Assess. Correct. Get Crystal-Clear Documents. Automatically evaluate document image quality and fix issues like blur, skew, noise and poor contrast — with the power of AI.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={handleAction}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-base font-semibold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <span>Upload Document</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full text-base font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-indigo-600 text-indigo-600 dark:fill-indigo-400 dark:text-indigo-400" />
                  <span>Watch Demo</span>
                </button>
              </div>
            </div>

            {/* Hero Center: Before/After Invoice Illustration (4 cols) */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center">
              <div className="relative w-full max-w-[340px] sm:max-w-[380px] flex items-center justify-center">
                {/* Poor Quality Invoice (Tilted Left) */}
                <div className="relative -rotate-6 transition-transform hover:-rotate-3 duration-300 w-44 sm:w-48 bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 shadow-xl border border-slate-300/80 dark:border-slate-700 filter contrast-75 brightness-90">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-800 text-white text-[10px] font-bold shadow-md whitespace-nowrap">
                    Poor Quality 🙁
                  </div>
                  {/* Blurred invoice content mockup */}
                  <div className="space-y-2 pt-2 blur-[0.7px]">
                    <div className="h-3 w-16 bg-slate-400/80 rounded" />
                    <div className="h-1.5 w-full bg-slate-300 dark:bg-slate-700 rounded" />
                    <div className="h-1.5 w-3/4 bg-slate-300 dark:bg-slate-700 rounded" />
                    <div className="border-t border-slate-300 dark:border-slate-700 pt-2 space-y-1.5">
                      <div className="flex justify-between">
                        <div className="h-1.5 w-12 bg-slate-400/60 rounded" />
                        <div className="h-1.5 w-6 bg-slate-400/60 rounded" />
                      </div>
                      <div className="flex justify-between">
                        <div className="h-1.5 w-14 bg-slate-400/60 rounded" />
                        <div className="h-1.5 w-8 bg-slate-400/60 rounded" />
                      </div>
                      <div className="flex justify-between">
                        <div className="h-1.5 w-10 bg-slate-400/60 rounded" />
                        <div className="h-1.5 w-7 bg-slate-400/60 rounded" />
                      </div>
                    </div>
                    <div className="h-4 w-full bg-slate-200 dark:bg-slate-700/50 rounded mt-3" />
                  </div>
                </div>

                {/* Arrow Connector */}
                <div className="absolute z-20 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40">
                  <ArrowRight className="w-4 h-4" />
                </div>

                {/* Enhanced Invoice (Right, Clean & Crisp) */}
                <div className="relative rotate-3 transition-transform hover:rotate-1 duration-300 -ml-8 sm:-ml-10 z-10 w-52 sm:w-56 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-2xl border border-indigo-200 dark:border-indigo-900/60">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-md flex items-center gap-1 whitespace-nowrap">
                    <span>Enhanced</span>
                    <Sparkles className="w-2.5 h-2.5" />
                  </div>

                  {/* Clean Invoice Content */}
                  <div className="space-y-2.5 pt-1 text-slate-800 dark:text-slate-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                          INVOICE
                        </h4>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400">
                          Invoice No: INV-2025-001
                        </p>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400">
                          Date: 25 Oct 2025
                        </p>
                      </div>
                      <div className="w-4 h-4 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <table className="w-full text-[9px] border-t border-b border-slate-100 dark:border-slate-800 py-1">
                      <thead>
                        <tr className="text-slate-500 dark:text-slate-400 text-left">
                          <th className="pb-1 font-semibold">Item</th>
                          <th className="pb-1 font-semibold text-center">Qty</th>
                          <th className="pb-1 font-semibold text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        <tr>
                          <td className="py-0.5">Consultation</td>
                          <td className="text-center">1</td>
                          <td className="text-right font-medium">$100</td>
                        </tr>
                        <tr>
                          <td className="py-0.5">Lab Test</td>
                          <td className="text-center">1</td>
                          <td className="text-right font-medium">$200</td>
                        </tr>
                        <tr>
                          <td className="py-0.5">Medicine</td>
                          <td className="text-center">1</td>
                          <td className="text-right font-medium">$150</td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span>Total</span>
                      <span className="text-indigo-600 dark:text-indigo-400 text-xs">$450</span>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800">
                      {/* Mini QR code mockup */}
                      <div className="w-6 h-6 border border-slate-300 dark:border-slate-700 rounded grid grid-cols-2 p-0.5 gap-0.5">
                        <div className="bg-slate-900 dark:bg-white rounded-[1px]" />
                        <div className="bg-slate-400 rounded-[1px]" />
                        <div className="bg-slate-400 rounded-[1px]" />
                        <div className="bg-slate-900 dark:bg-white rounded-[1px]" />
                      </div>
                      <div className="text-[8px] text-slate-400 italic">Signed digitally</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Right: 4 Highlights Card (3 cols) */}
            <div className="lg:col-span-3">
              <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-2xl border border-indigo-500/20 backdrop-blur-xl relative overflow-hidden space-y-4">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-white">Instant Quality Assessment</h5>
                    <p className="text-[11px] text-slate-400">Scored in &lt;1 second</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
                    <Wand2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-white">Auto-Correction with AI</h5>
                    <p className="text-[11px] text-slate-400">Adaptive filters</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-white">Secure & Reliable</h5>
                    <p className="text-[11px] text-slate-400">Encrypted processing</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-white">Easy Access Anywhere</h5>
                    <p className="text-[11px] text-slate-400">Cloud & mobile ready</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 3. SECTION: UPLOAD YOUR DOCUMENT */}
      {/* ---------------------------------------------------- */}
      <section className="py-16 bg-white dark:bg-slate-900/60 border-y border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-xl relative">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Quick Test</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white">
                Upload Your Document
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Drag & drop your image or click to browse
              </p>
            </div>

            {/* Drop Zone Box */}
            <div
              onClick={handleAction}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleAction();
              }}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.01]'
                  : 'border-indigo-200 dark:border-indigo-900/70 hover:border-indigo-400 bg-white dark:bg-slate-950/50'
              }`}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                <Upload className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                Drag & Drop File Here
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-5">
                Supports: JPG, PNG, PDF (max 10MB)
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-500/25 transition-all"
              >
                <span>Choose File</span>
              </button>
            </div>

            {/* Handwritten style badge / note */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
              <span className="italic">Works with any document: Invoices, ID cards, receipts, and forms!</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 4. SECTION: POWERFUL FEATURES (4 Cards) */}
      {/* ---------------------------------------------------- */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 mb-3">
            <Zap className="w-3.5 h-3.5" />
            <span>State of the Art</span>
          </div>
          <h3 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white">
            Powerful Features
          </h3>
          <p className="text-base text-slate-600 dark:text-slate-400 mt-2">
            Engineered with OpenCV, scikit-image, and PyMuPDF for reliable, production-grade document enhancements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Quality Assessment
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Detect issues like blur, skew, low contrast, and non-uniform lighting before OCR extraction occurs.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-5">
              <Wand2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Auto-Correction
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Enhance documents automatically using multi-stage adaptive pipelines, deskewing, and CLAHE illumination.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Accurate Results
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Get reliable 0-100 scoring, detailed defect breakdowns, and actionable explainability suggestions.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-5">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Secure & Private
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Your uploaded scans remain private and secure. Fully compliant with enterprise data protection standards.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 5. SECTION: BEFORE / AFTER PREVIEW + 6 QUALITY METRICS */}
      {/* ---------------------------------------------------- */}
      <section id="how-it-works" className="py-20 bg-slate-100/60 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left: Interactive Before / After Preview Card (6 cols) */}
            <div className="lg:col-span-6">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
                {/* Tabs */}
                <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      onClick={() => setActiveTab('before')}
                      className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                        activeTab === 'before'
                          ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      📄 Before (Raw)
                    </button>
                    <button
                      onClick={() => setActiveTab('after')}
                      className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                        activeTab === 'after'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      ✨ After (Enhanced)
                    </button>
                  </div>

                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    +42% OCR Recovery
                  </span>
                </div>

                {/* Document Display Area */}
                <div className="mt-6 aspect-[4/3] rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 relative flex items-center justify-center p-6">
                  {activeTab === 'before' ? (
                    <div className="w-full max-w-sm bg-slate-200/80 dark:bg-slate-800 rounded-xl p-5 shadow-inner rotate-[-3deg] filter blur-[1px] contrast-75 brightness-90">
                      <div className="h-4 w-28 bg-slate-400 rounded mb-3" />
                      <div className="space-y-2">
                        <div className="h-2 w-full bg-slate-300 dark:bg-slate-700 rounded" />
                        <div className="h-2 w-4/5 bg-slate-300 dark:bg-slate-700 rounded" />
                        <div className="h-2 w-3/4 bg-slate-300 dark:bg-slate-700 rounded" />
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-300 dark:border-slate-700 space-y-1.5">
                        <div className="h-2 w-full bg-slate-300 dark:bg-slate-700 rounded" />
                        <div className="h-2 w-2/3 bg-slate-300 dark:bg-slate-700 rounded" />
                      </div>
                      <div className="mt-4 text-center">
                        <span className="text-[11px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/80 px-2 py-0.5 rounded">
                          Overall Quality: 48/100 (Needs Correction)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl p-5 shadow-xl border border-indigo-200 dark:border-indigo-800/80 rotate-0">
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                          COMMERCIAL INVOICE
                        </h5>
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                          PASS
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                          <span>Doc ID: #INV-9821</span>
                          <span>Verified: Yes</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                          <span>Skew Angle: 0.0°</span>
                          <span>Contrast: Normalized</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                          <span>Noise: Filtered</span>
                          <span>Sharpness: 94/100</span>
                        </div>
                      </div>
                      <div className="mt-4 text-center">
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-full">
                          Overall Quality: 92/100 (High Quality)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Neutral Text & 6 Quality Metrics (6 cols) */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Clearer Documents, Better Decisions</span>
              </div>

              <h3 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white leading-tight">
                Our AI ensures your documents are clear, accurate, and ready to use.
              </h3>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                DocuQuality evaluates 6 comprehensive physical and digital quality metrics on every scanned page or camera photo, giving you deep insights before passing files downstream.
              </p>

              {/* Real 6 Quality Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {qualityMetrics.map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <div
                      key={metric.name}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
                    >
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <h5 className="font-bold text-xs text-slate-900 dark:text-white">
                          {metric.name}
                        </h5>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        {metric.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 6. SECTION: DASHBOARD PREVIEW */}
      {/* ---------------------------------------------------- */}
      <section id="dashboard" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 mb-3">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Interactive Analytics</span>
          </div>
          <h3 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white">
            Your Dashboard
          </h3>
          <p className="text-base text-slate-600 dark:text-slate-400 mt-2">
            Track batch quality trends, inspect defect distributions, and verify processing throughput in real time.
          </p>
        </div>

        {/* Dashboard Mockup (Matching reference screenshot) */}
        <div className="bg-slate-950 text-slate-100 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 overflow-hidden">
          {/* Dashboard Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-white">Your Dashboard</h4>
                <p className="text-xs text-slate-400">Real-time processing overview</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 py-1 px-3 rounded-full bg-slate-900 border border-slate-800 text-xs">
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                  N
                </div>
                <span className="font-medium text-slate-200">Nithya G</span>
              </div>
            </div>
          </div>

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-6">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Total Documents</span>
                <span className="text-emerald-400 text-[10px] font-semibold">↑ 12%</span>
              </div>
              <div className="text-2xl font-bold text-white">24</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Processed Successfully</span>
                <span className="text-emerald-400 text-[10px] font-semibold">↑ 10%</span>
              </div>
              <div className="text-2xl font-bold text-white">22</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Issues Detected</span>
                <span className="text-amber-400 text-[10px] font-semibold">↓ 8%</span>
              </div>
              <div className="text-2xl font-bold text-white">7</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Avg. Processing Time</span>
                <span className="text-emerald-400 text-[10px] font-semibold">↓ 20%</span>
              </div>
              <div className="text-2xl font-bold text-white">3.2s</div>
            </div>
          </div>

          {/* Graph & Activity Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Trends Chart Preview (8 cols) */}
            <div className="lg:col-span-8 p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-sm text-slate-200">Quality Trends</span>
                <span className="text-xs text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-lg">
                  Last 7 Days
                </span>
              </div>

              {/* Stylized Wave Chart */}
              <div className="h-32 sm:h-36 w-full flex items-end relative overflow-hidden">
                <svg className="w-full h-full text-indigo-500" viewBox="0 0 500 120" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gradientWave" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,80 C60,40 120,90 180,50 C240,20 300,70 360,40 C420,10 460,50 500,30 L500,120 L0,120 Z"
                    fill="url(#gradientWave)"
                  />
                  <path
                    d="M0,80 C60,40 120,90 180,50 C240,20 300,70 360,40 C420,10 460,50 500,30"
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="3"
                  />
                </svg>
              </div>
            </div>

            {/* Recent Activity (4 cols) */}
            <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-200">Recent Activity</span>
                <button
                  onClick={handleAction}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  View All →
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/40">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">invoice_001.png</p>
                    <p className="text-[10px] text-slate-400">Processed • 2 mins ago</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/40">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">receipt_blur.jpg</p>
                    <p className="text-[10px] text-slate-400">Processed • 5 mins ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 7. SECTION: CTA BANNER */}
      {/* ---------------------------------------------------- */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-800 p-8 sm:p-12 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-3 max-w-xl text-center md:text-left z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
              Ready to Experience the Power of AI?
            </span>
            <h3 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-white">
              Start Now with DocuQuality
            </h3>
            <p className="text-sm sm:text-base text-indigo-100">
              Upload your scanned documents and enjoy instant, automated clarity, deskewing, and contrast calibration.
            </p>
          </div>

          <div className="shrink-0 z-10">
            <button
              onClick={handleAction}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-bold text-indigo-900 bg-white hover:bg-slate-100 shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>Upload Document</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 8. ABOUT SECTION */}
      {/* ---------------------------------------------------- */}
      <section id="about" className="py-16 border-t border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-4">
          <h4 className="text-xl font-display font-bold text-slate-900 dark:text-white">
            About DocuQuality
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            DocuQuality is an end-to-end computer vision and AI system developed to automate document image quality assessment and auto-correction. It eliminates manual rescans, boosts downstream OCR capture accuracy, and provides actionable explainability for archival and compliance workflows.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 9. DARK NAVY FOOTER */}
      {/* ---------------------------------------------------- */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-900">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="font-display font-bold text-xl text-white">
                  Docu<span className="text-indigo-400">Quality</span>
                </span>
                <p className="text-xs text-slate-500">
                  Smarter Documents. A Clearer Tomorrow.
                </p>
              </div>
            </div>

            {/* Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
              <button
                onClick={() => alert('Privacy Policy: All document processing is encrypted in transit and at rest. Documents are kept confidential and not shared.')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
              <span>|</span>
              <button
                onClick={() => alert('Terms of Service: DocuQuality is provided for automated document quality assessment, correction, and OCR readiness evaluation.')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Terms of Service
              </button>
              <span>|</span>
              <button
                onClick={() => alert('Contact: For questions or enterprise integrations, contact support@docuquality.local')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Contact Us
              </button>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>© {new Date().getFullYear()} DocuQuality System. All rights reserved.</p>
            <p>FastAPI • OpenCV • scikit-image • PyMuPDF • React • Tailwind v4</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
