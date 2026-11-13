import React from 'react';

export function TVRemoteHints() {
  return (
    <div className="fixed bottom-0 inset-x-0 h-12 bg-slate-950/90 border-t border-slate-800/80 backdrop-blur-md px-8 flex items-center justify-between text-xs font-mono text-slate-300 z-30 select-none">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-1.5">
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-400 font-bold">▲ ▼ ◀ ▶</span>
          <span>Navigate</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-400 font-bold">ENTER</span>
          <span>Open Item</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-400 font-bold">BACK / ESC</span>
          <span>Return</span>
        </div>
      </div>
      <div className="flex items-center space-x-2 text-slate-400">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-sans font-medium text-xs">ScreenRoom TV Display Mode</span>
      </div>
    </div>
  );
}

