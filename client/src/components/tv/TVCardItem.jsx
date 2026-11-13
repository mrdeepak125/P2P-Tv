import React from 'react';
import { Image, Film, FileText, Sparkles, Play } from 'lucide-react';

export function TVCardItem({ file, isFocused, isNew, onSelect }) {
  const isImage = file.fileType === 'image';
  const isVideo = file.fileType === 'video';
  const isPdf = file.fileType === 'pdf';

  return (
    <div
      onClick={onSelect}
      className={`group relative flex flex-col rounded-3xl overflow-hidden cursor-pointer select-none transition-all duration-300 ${
        isFocused
          ? 'tv-focus-glow bg-slate-800 border-2 border-sky-400'
          : 'bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
      }`}
    >
      {/* "NEW" Indicator Badge */}
      {isNew && (
        <div className="absolute top-3 right-3 z-10 flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/40 animate-pulse">
          <Sparkles className="w-3.5 h-3.5 fill-current" />
          <span>NEW</span>
        </div>
      )}

      {/* Media Preview Box */}
      <div className="relative aspect-video w-full bg-slate-950/60 overflow-hidden flex items-center justify-center">
        {isImage && (
          <img
            src={file.url}
            alt={file.originalName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}

        {isVideo && (
          <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
            <video
              src={`${file.url}#t=0.5`}
              preload="metadata"
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-brand-600/90 flex items-center justify-center text-white shadow-xl shadow-brand-500/30 group-hover:scale-110 transition">
                <Play className="w-6 h-6 fill-current ml-1" />
              </div>
            </div>
            <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-black/70 text-[11px] font-mono text-slate-200">
              VIDEO
            </div>
          </div>
        )}

        {isPdf && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-rose-950/30 via-slate-900 to-slate-950 p-6 text-center">
            <div className="p-4 bg-rose-500/20 text-rose-400 rounded-2xl mb-2">
              <FileText className="w-10 h-10" />
            </div>
            <span className="text-xs font-mono text-rose-300 font-semibold uppercase tracking-wider">
              PDF DOCUMENT
            </span>
          </div>
        )}
      </div>

      {/* Card Details Footer */}
      <div className="p-4 flex flex-col justify-between flex-1">
        <h3 className="font-semibold text-white text-base truncate" title={file.originalName}>
          {file.originalName}
        </h3>
        <div className="flex items-center justify-between text-xs text-slate-400 mt-2 font-mono">
          <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
          <span>{new Date(file.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
}

