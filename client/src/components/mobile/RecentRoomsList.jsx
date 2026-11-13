import React from 'react';
import { Tv, Upload, ArrowRight, Trash2, Clock, CheckCircle2 } from 'lucide-react';

export function RecentRoomsList({ rooms = [], onReconnect, onUploadMore, onRemove }) {
  if (rooms.length === 0) return null;

  const mostRecent = rooms[0];
  const others = rooms.slice(1);

  return (
    <div className="w-full space-y-4">
      {/* Most Recent Room - Highlighted Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950/80 via-slate-900 to-slate-900 border-2 border-brand-500/40 p-6 shadow-2xl shadow-brand-500/10">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-brand-500/20 text-brand-300 rounded-2xl border border-brand-500/30">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-bold tracking-wider text-brand-400">
                  Previously Connected TV
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h3 className="font-bold text-white text-lg mt-0.5">{mostRecent.name || 'Living Room TV'}</h3>
            </div>
          </div>

          <button
            onClick={() => onRemove(mostRecent.roomId)}
            className="p-2 text-slate-500 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition"
            title="Remove from history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Room Details Bar */}
        <div className="grid grid-cols-3 gap-2 my-5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Code</div>
            <div className="text-base font-black font-mono tracking-widest text-brand-300">
              {mostRecent.roomCode}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Files</div>
            <div className="text-base font-bold text-white">{mostRecent.filesCount || 0}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Last Active</div>
            <div className="text-xs font-mono text-slate-300 mt-1">
              {new Date(mostRecent.lastConnected).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>

        {/* Two Priority Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onReconnect(mostRecent.roomCode)}
            className="flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-brand-500/20 transition"
          >
            <span>Reconnect</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onUploadMore(mostRecent.roomCode)}
            className="flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-100 font-bold text-xs border border-slate-700 transition"
          >
            <Upload className="w-4 h-4 text-sky-400" />
            <span>Upload More</span>
          </button>
        </div>
      </div>

      {/* Additional Previous Rooms */}
      {others.length > 0 && (
        <div className="space-y-2 pt-2">
          <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400 px-1">
            Other Saved Rooms ({others.length})
          </h4>
          <div className="space-y-2">
            {others.map((r) => (
              <div
                key={r.roomId}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition"
              >
                <div className="flex items-center space-x-3 truncate">
                  <div className="p-2 bg-slate-800 text-slate-400 rounded-xl">
                    <Tv className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-white text-xs truncate">{r.name}</div>
                    <div className="text-[11px] font-mono text-brand-400">Code: {r.roomCode}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => onReconnect(r.roomCode)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-brand-600 hover:text-white text-slate-300 text-xs font-medium border border-slate-700 transition"
                  >
                    Connect
                  </button>
                  <button
                    onClick={() => onRemove(r.roomId)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

