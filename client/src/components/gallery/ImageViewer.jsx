import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Move,
} from 'lucide-react';

export function ImageViewer({
  file,
  files = [],
  currentIndex = 0,
  onClose,
  onNext,
  onPrev,
  isTV = false,
}) {
  const [zoom, setZoom] = useState(1);
  const [isPlayingSlideshow, setIsPlayingSlideshow] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const slideshowTimerRef = useRef(null);
  const imageFiles = files.filter((f) => f.fileType === 'image');
  const totalImages = imageFiles.length || 1;
  const currentPos = imageFiles.findIndex((f) => f.fileId === file.fileId);
  const displayIndex = currentPos >= 0 ? currentPos + 1 : currentIndex + 1;

  // Zoom controls
  const handleZoomIn = () => {
    setZoom((z) => Math.min(3.5, Number((z + 0.35).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom((z) => {
      const next = Math.max(1.0, Number((z - 0.35).toFixed(2)));
      if (next === 1.0) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Slideshow
  useEffect(() => {
    if (isPlayingSlideshow) {
      slideshowTimerRef.current = setInterval(() => {
        if (onNext) onNext();
      }, 4000);
    } else {
      if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current);
    }
    return () => {
      if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current);
    };
  }, [isPlayingSlideshow, onNext]);

  const toggleSlideshow = () => {
    setIsPlayingSlideshow((prev) => !prev);
  };

  // Reset zoom & pan when image changes
  useEffect(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, [file]);

  // Keyboard and TV Remote Event Listener with Up/Down/Left/Right Panning
  const handleKeyDown = useCallback(
    (e) => {
      const isZoomed = zoom > 1.1;

      switch (e.key) {
        // Up & Down Pan vertically across mid to top and bottom
        case 'ArrowUp':
          e.preventDefault();
          if (isZoomed) {
            setPanOffset((prev) => ({ ...prev, y: Math.min(prev.y + 120, 450 * (zoom - 1)) }));
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (isZoomed) {
            setPanOffset((prev) => ({ ...prev, y: Math.max(prev.y - 120, -450 * (zoom - 1)) }));
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (isZoomed && panOffset.x > -200 * (zoom - 1)) {
            // Pan right
            setPanOffset((prev) => ({ ...prev, x: prev.x - 120 }));
          } else {
            // Next image
            if (onNext) onNext();
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (isZoomed && panOffset.x < 200 * (zoom - 1)) {
            // Pan left
            setPanOffset((prev) => ({ ...prev, x: prev.x + 120 }));
          } else {
            // Prev image
            if (onPrev) onPrev();
          }
          break;

        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;

        case '-':
        case '_':
          e.preventDefault();
          handleZoomOut();
          break;

        case '0':
          e.preventDefault();
          handleResetZoom();
          break;

        case ' ':
          e.preventDefault();
          toggleSlideshow();
          break;

        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          if (onClose) onClose();
          break;

        default:
          break;
      }
    },
    [zoom, panOffset, onNext, onPrev, onClose, isPlayingSlideshow]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 bg-[#07090e]/98 backdrop-blur-2xl flex flex-col justify-between select-none animate-fadeIn">
      {/* Top Header Bar */}
      <div className="h-16 bg-gradient-to-b from-black/90 to-transparent px-6 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3 overflow-hidden">
          <span className="px-3 py-1 rounded-xl bg-brand-500/20 text-brand-300 font-mono text-xs font-bold border border-brand-500/30">
            {displayIndex} / {totalImages}
          </span>
          <h2 className="text-sm md:text-base font-semibold text-white truncate max-w-sm md:max-w-md">
            {file.originalName}
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 md:space-x-3">
          {/* Slideshow button */}
          <button
            onClick={toggleSlideshow}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
              isPlayingSlideshow
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse'
                : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:text-white'
            }`}
            title="Space = Slideshow"
          >
            {isPlayingSlideshow ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">
              {isPlayingSlideshow ? 'Pause Slideshow' : 'Play Slideshow'}
            </span>
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-1 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-1">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-slate-300 hover:text-white rounded-xl transition"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 text-xs font-mono text-brand-300 font-bold hover:text-white transition"
              title="Reset Zoom to 100% (0)"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-slate-300 hover:text-white rounded-xl transition"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Close Viewer */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-rose-950/80 hover:text-rose-300 text-slate-300 border border-slate-700/80 transition"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Viewport with Pan Support */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden p-4">
        {/* Previous Button */}
        {totalImages > 1 && (
          <button
            onClick={onPrev}
            className="absolute left-6 z-20 p-3.5 rounded-full bg-slate-900/70 hover:bg-slate-800 text-white border border-slate-700/80 backdrop-blur-md transition transform hover:scale-110"
            title="Previous (ArrowLeft)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Pan Container */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-150 ease-out"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          }}
        >
          <img
            src={file.url}
            alt={file.originalName}
            className="max-h-[82vh] max-w-[92vw] object-contain rounded-xl shadow-[0_0_60px_rgba(0,0,0,0.9)] transition-all duration-200 pointer-events-auto"
            draggable={false}
          />
        </div>

        {/* Next Button */}
        {totalImages > 1 && (
          <button
            onClick={onNext}
            className="absolute right-6 z-20 p-3.5 rounded-full bg-slate-900/70 hover:bg-slate-800 text-white border border-slate-700/80 backdrop-blur-md transition transform hover:scale-110"
            title="Next (ArrowRight)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Information & TV Remote Hints */}
      <div className="h-14 bg-gradient-to-t from-black/90 to-transparent px-6 flex items-center justify-between text-xs text-slate-400 font-mono z-20">
        <div>
          {isTV ? (
            <div className="flex items-center space-x-3">
              <span>[▲ ▼] Pan Top/Bottom</span>
              <span>[◀ ▶] Next / Prev</span>
              <span>[+ -] Zoom</span>
              <span>[0] 100%</span>
              <span>[SPACE] Slideshow</span>
              <span>[BACK] Return</span>
            </div>
          ) : (
            <span>Use Left/Right to turn, Up/Down to pan, or Space for slideshow</span>
          )}
        </div>
        <div className="text-slate-500">
          {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.mimeType}
        </div>
      </div>
    </div>
  );
}
