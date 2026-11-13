import React from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  X,
  Tv,
  RotateCcw,
  SkipBack,
  SkipForward,
  Maximize2,
} from 'lucide-react';
import { useRoom } from '../../context/RoomContext';

export function VirtualTVRemote({ isOpen, onClose }) {
  const { sendRemoteAction, tvOnline } = useRoom();

  if (!isOpen) return null;

  const triggerHaptic = (action, payload = null) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
    } catch {}
    sendRemoteAction(action, payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-fadeIn">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl flex flex-col items-center select-none">
        {/* Remote Top Header */}
        <div className="w-full flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-brand-500/20 text-brand-400 rounded-2xl border border-brand-500/30">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base tracking-tight">Smart TV Remote</h3>
              <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                <span className={`w-2 h-2 rounded-full ${tvOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span className="font-medium">{tvOnline ? 'TV Live Connected' : 'TV Disconnected'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zoom & View Presets Row */}
        <div className="grid grid-cols-3 gap-2 w-full mt-5 mb-2">
          <button
            onClick={() => triggerHaptic('zoom-out')}
            className="flex items-center justify-center space-x-1.5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs border border-slate-700 transition"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4 text-sky-400" />
            <span>Zoom Out</span>
          </button>

          <button
            onClick={() => triggerHaptic('zoom-reset')}
            className="flex items-center justify-center space-x-1.5 py-3 rounded-2xl bg-brand-600/30 hover:bg-brand-600 active:scale-95 text-brand-300 hover:text-white font-black text-xs border border-brand-500/40 transition shadow-sm"
            title="Reset Zoom to 100% / Original"
          >
            <RotateCcw className="w-3.5 h-3.5 text-brand-300" />
            <span>Original 1:1</span>
          </button>

          <button
            onClick={() => triggerHaptic('zoom-in')}
            className="flex items-center justify-center space-x-1.5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs border border-slate-700 transition"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4 text-sky-400" />
            <span>Zoom In</span>
          </button>
        </div>

        {/* D-Pad Controller (Up / Down / Left / Right / OK) */}
        <div className="my-6 flex flex-col items-center">
          {/* Up (Pan Up / Navigate Up) */}
          <button
            onClick={() => triggerHaptic('arrow-up')}
            className="w-16 h-14 rounded-2xl bg-slate-800 hover:bg-brand-600 active:scale-90 text-slate-200 hover:text-white flex items-center justify-center shadow-lg transition border border-slate-700/80 mb-2"
            title="Navigate / Pan Up"
          >
            <ChevronUp className="w-7 h-7" />
          </button>

          {/* Left / OK Center / Right */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => triggerHaptic('arrow-left')}
              className="w-14 h-16 rounded-2xl bg-slate-800 hover:bg-brand-600 active:scale-90 text-slate-200 hover:text-white flex items-center justify-center shadow-lg transition border border-slate-700/80"
              title="Navigate / Pan Left"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>

            {/* Center OK / Select Button */}
            <button
              onClick={() => triggerHaptic('enter')}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 via-indigo-600 to-sky-500 hover:from-brand-400 hover:to-sky-400 active:scale-90 text-white font-black text-sm flex items-center justify-center shadow-xl shadow-brand-500/40 transition border-2 border-white/20"
              title="OK / Select"
            >
              OK
            </button>

            <button
              onClick={() => triggerHaptic('arrow-right')}
              className="w-14 h-16 rounded-2xl bg-slate-800 hover:bg-brand-600 active:scale-90 text-slate-200 hover:text-white flex items-center justify-center shadow-lg transition border border-slate-700/80"
              title="Navigate / Pan Right"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          </div>

          {/* Down (Pan Down / Navigate Down) */}
          <button
            onClick={() => triggerHaptic('arrow-down')}
            className="w-16 h-14 rounded-2xl bg-slate-800 hover:bg-brand-600 active:scale-90 text-slate-200 hover:text-white flex items-center justify-center shadow-lg transition border border-slate-700/80 mt-2"
            title="Navigate / Pan Down"
          >
            <ChevronDown className="w-7 h-7" />
          </button>
        </div>

        {/* Media & Slide Navigation Row */}
        <div className="grid grid-cols-4 gap-2 w-full pt-4 border-t border-slate-800">
          {/* Back / Exit */}
          <button
            onClick={() => triggerHaptic('back')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white transition border border-slate-700 text-[11px] font-semibold space-y-1"
            title="Return to Gallery"
          >
            <ArrowLeft className="w-4 h-4 text-rose-400" />
            <span>Back</span>
          </button>

          {/* Prev Slide / Turn Page */}
          <button
            onClick={() => triggerHaptic('arrow-left')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white transition border border-slate-700 text-[11px] font-semibold space-y-1"
            title="Previous Item / Page"
          >
            <SkipBack className="w-4 h-4 text-sky-400" />
            <span>Prev</span>
          </button>

          {/* Play / Pause */}
          <button
            onClick={() => triggerHaptic('toggle-play')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white transition border border-slate-700 text-[11px] font-semibold space-y-1"
            title="Play or Pause"
          >
            <Play className="w-4 h-4 text-emerald-400" />
            <span>Play</span>
          </button>

          {/* Next Slide / Turn Page */}
          <button
            onClick={() => triggerHaptic('arrow-right')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white transition border border-slate-700 text-[11px] font-semibold space-y-1"
            title="Next Item / Page"
          >
            <SkipForward className="w-4 h-4 text-sky-400" />
            <span>Next</span>
          </button>
        </div>
      </div>
    </div>
  );
}
