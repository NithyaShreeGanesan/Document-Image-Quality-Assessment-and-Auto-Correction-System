import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Columns,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Layers,
  SplitSquareVertical,
} from 'lucide-react';

interface ImageSliderProps {
  originalUrl: string;
  correctedUrl?: string;
  altText?: string;
  scoreBefore?: number;
  scoreAfter?: number;
}

export const ImageSlider: React.FC<ImageSliderProps> = ({
  originalUrl,
  correctedUrl,
  altText = 'Document Image',
  scoreBefore,
  scoreAfter,
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage 0-100
  const [viewMode, setViewMode] = useState<'slider' | 'sideBySide' | 'zoom'>('slider');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // If no corrected URL yet, show original
  const effectiveCorrectedUrl = correctedUrl || originalUrl;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (viewMode === 'slider') {
      setIsDragging(true);
      updateSliderPosition(e.clientX);
    } else if (viewMode === 'zoom') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const updateSliderPosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(2, Math.min(98, (x / rect.width) * 100));
    setSliderPos(percent);
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging && viewMode === 'slider') {
        updateSliderPosition(e.clientX);
      } else if (isPanning && viewMode === 'zoom') {
        setPanOffset({
          x: e.clientX - startPan.x,
          y: e.clientY - startPan.y,
        });
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      setIsPanning(false);
    };

    if (isDragging || isPanning) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, isPanning, startPan, viewMode, updateSliderPosition]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Top Controls Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-1">
        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => { setViewMode('slider'); resetZoom(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === 'slider'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            Split Slider
          </button>
          <button
            onClick={() => { setViewMode('sideBySide'); resetZoom(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === 'sideBySide'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            Side by Side
          </button>
          <button
            onClick={() => { setViewMode('zoom'); setZoomLevel(2); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === 'zoom'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ZoomIn className="w-3.5 h-3.5" />
            Zoom & Pan
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {viewMode === 'zoom' && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-xs">
              <button
                onClick={() => setZoomLevel((z) => Math.max(1, z - 0.5))}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-slate-700 dark:text-slate-300 min-w-[38px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(4, z + 0.5))}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={resetZoom}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                title="Reset View"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Visual Display Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        className={`relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-xl ${
          viewMode === 'zoom' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        } ${isFullscreen ? 'h-screen' : 'min-h-[460px] max-h-[620px] aspect-[4/3]'}`}
      >
        {/* MODE 1: SPLIT SLIDER */}
        {viewMode === 'slider' && (
          <div className="relative w-full h-full select-none flex items-center justify-center p-2 bg-slate-950">
            {/* Background: Corrected Image (Right) */}
            <img
              src={effectiveCorrectedUrl}
              alt={`${altText} - Corrected`}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />

            {/* Foreground: Original Image (Left, clipped by sliderPos) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src={originalUrl}
                alt={`${altText} - Original`}
                style={{
                  width: containerRef.current?.clientWidth || '100%',
                  maxWidth: 'none',
                }}
                className="h-full object-contain pointer-events-none"
              />
            </div>

            {/* Draggable Divider Handle */}
            <div
              className="comparison-slider-handle flex items-center justify-center"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 shadow-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <Columns className="w-4 h-4" />
              </div>
            </div>

            {/* Pill Labels */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-rose-950/80 text-rose-300 border border-rose-800/80 backdrop-blur-md shadow-md">
                Original (Before)
              </span>
              {scoreBefore !== undefined && (
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-900/80 text-slate-300 border border-slate-700">
                  {Math.round(scoreBefore)} pts
                </span>
              )}
            </div>

            <div className="absolute top-4 right-4 z-20 pointer-events-none flex items-center gap-2">
              {scoreAfter !== undefined && (
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-900/80 text-emerald-400 border border-emerald-900">
                  {Math.round(scoreAfter)} pts
                </span>
              )}
              <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 backdrop-blur-md shadow-md flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Corrected (After)
              </span>
            </div>

            {/* Slider Hint */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
              <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-black/60 text-white/90 backdrop-blur-md border border-white/10 shadow-md">
                Drag slider or click anywhere to compare
              </span>
            </div>
          </div>
        )}

        {/* MODE 2: SIDE BY SIDE */}
        {viewMode === 'sideBySide' && (
          <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 p-2 bg-slate-950">
            {/* Left: Original */}
            <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden p-2">
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-950/90 text-rose-300 border border-rose-800">
                  Original
                </span>
                {scoreBefore !== undefined && (
                  <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-900 text-slate-300 border border-slate-700">
                    {Math.round(scoreBefore)}
                  </span>
                )}
              </div>
              <img
                src={originalUrl}
                alt="Original Document"
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            </div>

            {/* Right: Corrected */}
            <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden p-2">
              <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                {scoreAfter !== undefined && (
                  <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-900 text-emerald-400 border border-emerald-900">
                    {Math.round(scoreAfter)}
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Corrected
                </span>
              </div>
              <img
                src={effectiveCorrectedUrl}
                alt="Corrected Document"
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        )}

        {/* MODE 3: ZOOM & PAN */}
        {viewMode === 'zoom' && (
          <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-slate-950 p-2">
            <div className="absolute top-3 left-3 z-10">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-950/90 text-indigo-300 border border-indigo-800 flex items-center gap-1.5">
                <ZoomIn className="w-3.5 h-3.5" />
                Inspect Glyphs (Corrected) - Click and Drag to Pan
              </span>
            </div>

            <div
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                transition: isPanning ? 'none' : 'transform 0.2s ease-out',
              }}
              className="max-w-full max-h-full flex items-center justify-center origin-center"
            >
              <img
                src={effectiveCorrectedUrl}
                alt="Zoomed Corrected Document"
                className="max-h-full max-w-full object-contain pointer-events-none select-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
