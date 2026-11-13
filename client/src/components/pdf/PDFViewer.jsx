import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  FileText,
  Loader2,
  AlertCircle,
  RotateCcw,
  Sliders,
  Move,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { getMediaUrl } from '../../api/apiClient';

// Setup resilient worker configuration with fallback
try {
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${
      pdfjsLib.version || '3.11.174'
    }/pdf.worker.min.js`;
  }
} catch (e) {
  console.warn('[PDFViewer] Worker setup warning:', e);
}

export function PDFViewer({ file, onClose, isTV = false }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useNativeFallback, setUseNativeFallback] = useState(false);

  const canvasRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Load PDF Document safely
  useEffect(() => {
    if (!file || !file.url) return;
    setLoading(true);
    setError(null);

    let isMounted = true;

    const loadingTask = pdfjsLib.getDocument({
      url: getMediaUrl(file.url),
      withCredentials: false,
      // If external worker fails, continue without worker
      stopAtErrors: false,
    });

    loadingTask.promise
      .then((pdf) => {
        if (!isMounted) return;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('[PDFViewer] PDF.js render warning, enabling native PDF embed:', err.message);
        if (isMounted) {
          // Switch to native embed automatically if PDF.js fails
          setUseNativeFallback(true);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      try {
        loadingTask.destroy();
      } catch {}
    };
  }, [file]);

  // Render Page on Canvas
  const renderPage = useCallback(
    async (pageNumber) => {
      if (!pdfDoc || !canvasRef.current || useNativeFallback) return;

      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(pageNumber);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // High DPI sharpness support
        const pixelRatio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale });

        canvas.height = viewport.height * pixelRatio;
        canvas.width = viewport.width * pixelRatio;
        canvas.style.height = `${viewport.height}px`;
        canvas.style.width = `${viewport.width}px`;

        context.scale(pixelRatio, pixelRatio);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('[PDFViewer] Render error:', err);
        }
      }
    },
    [pdfDoc, scale, useNativeFallback]
  );

  useEffect(() => {
    if (pdfDoc && !loading && !useNativeFallback) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale, loading, useNativeFallback, renderPage]);

  // Page Controls
  const prevPage = () => {
    setCurrentPage((p) => Math.max(1, p - 1));
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  };

  const nextPage = () => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  };

  // Zoom Controls
  const zoomIn = () => setScale((s) => Math.min(3.0, Number((s + 0.25).toFixed(2))));
  const zoomOut = () => setScale((s) => Math.max(0.6, Number((s - 0.25).toFixed(2))));
  const resetZoom = () => setScale(1.0);

  const fitWidth = () => {
    if (!scrollContainerRef.current || !pdfDoc) return;
    pdfDoc.getPage(currentPage).then((page) => {
      const containerWidth = scrollContainerRef.current.clientWidth - 64;
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const newScale = containerWidth / unscaledViewport.width;
      setScale(Number(newScale.toFixed(2)));
    });
  };

  // Panning Controls (Up / Down / Left / Right) when zoomed in
  const pan = (dx, dy) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: dx, top: dy, behavior: 'smooth' });
    }
  };

  // TV Remote Key Event Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isZoomed = scale > 1.1;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          // Pan Up toward the top of screen
          pan(0, -180);
          break;

        case 'ArrowDown':
          e.preventDefault();
          // Pan Down toward the bottom of screen
          pan(0, 180);
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (isZoomed && scrollContainerRef.current && scrollContainerRef.current.scrollLeft + scrollContainerRef.current.clientWidth < scrollContainerRef.current.scrollWidth - 50) {
            pan(180, 0);
          } else {
            nextPage();
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (isZoomed && scrollContainerRef.current && scrollContainerRef.current.scrollLeft > 50) {
            pan(-180, 0);
          } else {
            prevPage();
          }
          break;

        case '+':
        case '=':
          e.preventDefault();
          zoomIn();
          break;

        case '-':
        case '_':
          e.preventDefault();
          zoomOut();
          break;

        case '0':
          e.preventDefault();
          resetZoom();
          break;

        case 'PageDown':
          e.preventDefault();
          nextPage();
          break;

        case 'PageUp':
          e.preventDefault();
          prevPage();
          break;

        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          if (onClose) onClose();
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages, currentPage, scale, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-[#07090e]/98 backdrop-blur-2xl flex flex-col text-slate-100 select-none animate-fadeIn">
      {/* Top Header / Control Toolbar */}
      <div className="h-16 border-b border-slate-800/80 bg-slate-950/90 px-6 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center space-x-3 overflow-hidden pr-4">
          <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30">
            <FileText className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h2 className="font-bold text-white text-sm md:text-base truncate max-w-sm md:max-w-md">
              {file.originalName}
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Page {currentPage} of {totalPages || '...'} • Zoom {Math.round(scale * 100)}%
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center space-x-2 md:space-x-3">
          {/* Zoom In / Out / Reset */}
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-700/80 rounded-2xl p-1">
            <button
              onClick={zoomOut}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={resetZoom}
              className="px-2 text-xs font-mono font-bold text-brand-300 hover:text-white transition"
              title="Reset to 100% (0)"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={zoomIn}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Fit Width Preset */}
          <button
            onClick={fitWidth}
            className="hidden sm:block px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            Fit Width
          </button>

          {/* Toggle Native / Canvas Embed if needed */}
          <button
            onClick={() => setUseNativeFallback((prev) => !prev)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-400 hover:text-white transition"
            title="Switch renderer mode"
          >
            {useNativeFallback ? 'Canvas Mode' : 'Native View'}
          </button>

          {/* Close Viewer */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/80 hover:text-rose-300 text-slate-300 border border-slate-700/80 transition"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Document Viewport (Centered with Pan/Scroll support) */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto p-4 md:p-8 flex items-center justify-center relative scrollbar-none"
      >
        {loading && (
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
            <p className="text-sm font-semibold text-slate-200">Opening PDF Document...</p>
          </div>
        )}

        {/* Mode A: Native PDF Embed (100% fail-safe fallback) */}
        {useNativeFallback ? (
          <div className="w-full h-full max-w-5xl bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
            <iframe
              src={`${getMediaUrl(file.url)}#toolbar=1&navpanes=0`}
              title={file.originalName}
              className="w-full h-full flex-1 border-0"
            />
          </div>
        ) : (
          /* Mode B: Pure HTML5 Canvas Rendering */
          <div className={`transition-all duration-150 ${loading ? 'hidden' : 'block'} my-auto`}>
            <canvas
              ref={canvasRef}
              className="shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-xl border border-slate-700/80 bg-white"
            />
          </div>
        )}
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="h-16 border-t border-slate-800/80 bg-slate-950/90 px-6 flex items-center justify-between shrink-0 shadow-2xl">
        <div className="flex items-center space-x-2">
          <button
            onClick={prevPage}
            disabled={currentPage <= 1}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-100 font-semibold text-xs md:text-sm border border-slate-700 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev Page</span>
          </button>

          <button
            onClick={nextPage}
            disabled={currentPage >= totalPages}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-30 disabled:pointer-events-none text-white font-bold text-xs md:text-sm shadow-lg shadow-brand-500/20 transition"
          >
            <span>Next Page</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* TV Remote Helper Hint */}
        {isTV && (
          <div className="hidden md:flex items-center space-x-4 text-xs text-slate-400 font-mono">
            <span>[▲ ▼] Pan Top/Bottom</span>
            <span>[◀ ▶] Turn Page</span>
            <span>[+ -] Zoom</span>
            <span>[0] 100%</span>
            <span>[BACK] Return</span>
          </div>
        )}

        <div className="flex items-center space-x-2 text-xs md:text-sm font-mono text-slate-300">
          <span>Page</span>
          <span className="font-black text-brand-300 text-base">{currentPage}</span>
          <span className="text-slate-500">/</span>
          <span>{totalPages || 1}</span>
        </div>
      </div>
    </div>
  );
}
