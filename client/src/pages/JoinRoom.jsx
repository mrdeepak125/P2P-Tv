import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { KeyRound, ArrowLeft, Loader2, Tv } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { useRoom } from '../context/RoomContext';
import { useToast } from '../context/ToastContext';

export function JoinRoom() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { setCurrentRoom, connectSocket, saveRoomToHistory } = useRoom();

  const codeParam = searchParams.get('code');
  const tokenParam = searchParams.get('token');

  const [code, setCode] = useState(codeParam ? codeParam.toUpperCase() : '');
  const [isJoining, setIsJoining] = useState(false);

  const performJoin = async (targetCode) => {
    const cleanCode = (targetCode || code).trim().toUpperCase();
    if (cleanCode.length !== 4) {
      showToast('Room code must be 4 characters', 'error');
      return;
    }

    try {
      setIsJoining(true);
      const room = await apiClient.getRoomByCode(cleanCode);
      setCurrentRoom(room);
      connectSocket(room, 'mobile', 'Mobile User');
      saveRoomToHistory(room);
      showToast(`Connected to Room ${cleanCode}!`, 'success');
      navigate(`/room/${cleanCode}`);
    } catch (err) {
      console.error('[JoinRoom] Error:', err);
      showToast(err.message || 'Room not found or has ended', 'error');
      setIsJoining(false);
    }
  };

  // Auto-join if codeParam provided (e.g. from scanned QR)
  useEffect(() => {
    if (codeParam && codeParam.length === 4) {
      performJoin(codeParam);
    }
  }, [codeParam]);

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col justify-between selection:bg-brand-500">
      {/* Header */}
      <header className="px-6 py-5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center space-x-2 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>
        <span className="font-bold text-xs uppercase tracking-wider text-slate-400">Join Room</span>
      </header>

      {/* Main Card */}
      <main className="flex-1 max-w-sm w-full mx-auto p-6 flex flex-col justify-center">
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center mx-auto">
              <KeyRound className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-white">Enter Room Code</h2>
            <p className="text-xs text-slate-400">
              Type the 4-character code displayed on the TV screen.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              performJoin();
            }}
            className="space-y-4"
          >
            <input
              type="text"
              maxLength={4}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD"
              disabled={isJoining}
              className="w-full text-center tracking-[0.4em] font-mono font-black text-4xl py-4 rounded-2xl bg-slate-950 border-2 border-brand-500/60 text-brand-300 placeholder-slate-700 uppercase focus:outline-none focus:border-brand-400 disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={isJoining || code.trim().length !== 4}
              className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-sm shadow-xl shadow-brand-500/25 transition flex items-center justify-center space-x-2"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Connecting to TV...</span>
                </>
              ) : (
                <span>Connect to TV</span>
              )}
            </button>
          </form>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-600 border-t border-slate-900">
        ScreenRoom • Smart TV Wireless Sharing
      </footer>
    </div>
  );
}

