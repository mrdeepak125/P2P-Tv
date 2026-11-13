import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  KeyRound,
  Tv,
  PlusCircle,
  Smartphone,
  Share2,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { BuiltInQRScanner } from '../components/qr/BuiltInQRScanner';
import { RecentRoomsList } from '../components/mobile/RecentRoomsList';
import { useRoom } from '../context/RoomContext';
import { useToast } from '../context/ToastContext';

export function Home() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { savedRooms, removeSavedRoom } = useRoom();

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showCodeModal, setShowCodeModal] = useState(false);

  const handleScanSuccess = ({ code, token }) => {
    setIsScannerOpen(false);
    showToast(`QR Code detected: Room ${code}!`, 'success');
    navigate(`/join?code=${encodeURIComponent(code)}${token ? `&token=${encodeURIComponent(token)}` : ''}`);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const clean = manualCode.trim().toUpperCase();
    if (clean.length !== 4) {
      showToast('Please enter a valid 4-character room code', 'error');
      return;
    }
    navigate(`/join?code=${encodeURIComponent(clean)}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col justify-between selection:bg-brand-500">
      {/* Top Navbar */}
      <header className="px-6 py-5 border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 p-0.5 shadow-lg shadow-brand-500/20">
            <div className="w-full h-full bg-[#0f1422] rounded-[14px] flex items-center justify-center">
              <Tv className="w-5 h-5 text-brand-400" />
            </div>
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              ScreenRoom
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
              Wireless TV Share
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/tv')}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-800 text-xs font-bold transition shadow-sm"
        >
          <Tv className="w-4 h-4" />
          <span className="hidden sm:inline">Launch TV Mode</span>
          <span className="sm:hidden">TV Mode</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto p-6 flex flex-col justify-center space-y-8 my-auto">
        {/* Hero Branding */}
        <div className="text-center space-y-3 pt-2">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Internet-Powered • No Same-WiFi Required</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Share Files Instantly <br />
            <span className="bg-gradient-to-r from-brand-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              to Any Smart TV
            </span>
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Scan the TV screen QR code or enter the 4-digit code to instantly upload photos, videos, and PDFs.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-3.5">
          {/* 1. In-App Camera QR Scanner */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="w-full relative group overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 via-indigo-600 to-sky-500 p-0.5 shadow-xl shadow-brand-500/25 active:scale-[0.99] transition duration-200"
          >
            <div className="px-6 py-4 rounded-[22px] bg-gradient-to-r from-brand-600/90 to-indigo-700/90 flex items-center justify-between text-white">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-extrabold text-base">Scan TV QR Code</div>
                  <div className="text-xs text-brand-100/80">Opens camera to pair instantly</div>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                →
              </div>
            </div>
          </button>

          {/* 2. Enter 4-Character Room Code */}
          <button
            onClick={() => setShowCodeModal(true)}
            className="w-full flex items-center justify-between px-6 py-4 rounded-3xl bg-slate-900 hover:bg-slate-800/90 border border-slate-700/80 text-white transition active:scale-[0.99]"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-slate-800 text-sky-400 rounded-2xl">
                <KeyRound className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="font-bold text-base">Enter Room Code</div>
                <div className="text-xs text-slate-400">Join using 4-character TV code</div>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">_ _ _ _</span>
          </button>

          {/* 3. Create New Room */}
          <button
            onClick={() => navigate('/create-room')}
            className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-2xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold transition"
          >
            <PlusCircle className="w-4 h-4 text-brand-400" />
            <span>Create New Room from Mobile</span>
          </button>
        </div>

        {/* Previously Connected Rooms Memory Card */}
        {savedRooms.length > 0 && (
          <div className="pt-2">
            <RecentRoomsList
              rooms={savedRooms}
              onReconnect={(code) => navigate(`/join?code=${code}`)}
              onUploadMore={(code) => navigate(`/room/${code}?action=upload`)}
              onRemove={removeSavedRoom}
            />
          </div>
        )}

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800/60 text-center">
          <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/50">
            <Zap className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
            <div className="text-xs font-semibold text-slate-200">Real-Time Sync</div>
            <div className="text-[10px] text-slate-500">Live TV updates</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/50">
            <Tv className="w-5 h-5 text-sky-400 mx-auto mb-1.5" />
            <div className="text-xs font-semibold text-slate-200">TV Remote</div>
            <div className="text-[10px] text-slate-500">Phone control</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/50">
            <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
            <div className="text-xs font-semibold text-slate-200">Persistent</div>
            <div className="text-[10px] text-slate-500">Remembers room</div>
          </div>
        </div>
      </main>

      {/* Built-in Camera QR Scanner Modal */}
      {isScannerOpen && (
        <BuiltInQRScanner
          onScanSuccess={handleScanSuccess}
          onClose={() => setIsScannerOpen(false)}
          onManualEntry={() => {
            setIsScannerOpen(false);
            setShowCodeModal(true);
          }}
        />
      )}

      {/* Manual Code Input Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl">
            <h3 className="font-bold text-white text-lg">Enter Room Code</h3>
            <p className="text-xs text-slate-400 mt-1">
              Type the 4-character code shown on your Smart TV screen.
            </p>

            <form onSubmit={handleManualSubmit} className="mt-5 space-y-4">
              <input
                type="text"
                maxLength={4}
                autoFocus
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="ABCD"
                className="w-full text-center tracking-[0.4em] font-mono font-black text-3xl py-4 rounded-2xl bg-slate-950 border-2 border-brand-500/60 text-brand-300 placeholder-slate-700 uppercase focus:outline-none focus:border-brand-400"
              />

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCodeModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={manualCode.trim().length !== 4}
                  className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-brand-500/20 transition"
                >
                  Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-600 border-t border-slate-900">
        ScreenRoom © 2026 • Wireless Smart TV Sharing & Document Viewer
      </footer>
    </div>
  );
}

