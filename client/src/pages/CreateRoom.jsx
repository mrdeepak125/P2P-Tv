import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, ArrowLeft, Loader2, Tv } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { useRoom } from '../context/RoomContext';
import { useToast } from '../context/ToastContext';

export function CreateRoom() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { setCurrentRoom, connectSocket, saveRoomToHistory } = useRoom();

  const [roomName, setRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      const room = await apiClient.createRoom({
        name: roomName.trim() || 'Shared Room',
        createdBy: 'Mobile',
      });

      setCurrentRoom(room);
      connectSocket(room, 'mobile', 'Mobile Host');
      saveRoomToHistory(room);
      showToast(`Room ${room.roomCode} created!`, 'success');
      navigate(`/room/${room.roomCode}`);
    } catch (err) {
      console.error('[CreateRoom] Error:', err);
      showToast(err.message || 'Failed to create room', 'error');
      setIsCreating(false);
    }
  };

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
        <span className="font-bold text-xs uppercase tracking-wider text-slate-400">
          Create Room
        </span>
      </header>

      {/* Main Card */}
      <main className="flex-1 max-w-sm w-full mx-auto p-6 flex flex-col justify-center">
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center mx-auto">
              <PlusCircle className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-white">Create New Room</h2>
            <p className="text-xs text-slate-400">
              Generates a unique 4-character room code and QR code for Smart TV connection.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Room Name (Optional)
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. Living Room TV, Office Screen"
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-brand-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-sm shadow-xl shadow-brand-500/25 transition flex items-center justify-center space-x-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Creating Room...</span>
                </>
              ) : (
                <span>Create Room & Get Code</span>
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

