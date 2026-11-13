import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Upload,
  Tv,
  MessageSquare,
  QrCode,
  Copy,
  Check,
  Search,
  Filter,
  Trash2,
  Edit2,
  FileText,
  Image as ImageIcon,
  Film,
  Sparkles,
  ArrowLeft,
  Share2,
  ChevronRight,
  Maximize2,
  Power,
  RotateCcw,
  X,
} from 'lucide-react';
import { useRoom } from '../context/RoomContext';
import { apiClient } from '../api/apiClient';
import { useToast } from '../context/ToastContext';
import { FileUploadModal } from '../components/upload/FileUploadModal';
import { VirtualTVRemote } from '../components/mobile/VirtualTVRemote';
import { MessageDrawer } from '../components/messages/MessageDrawer';
import { QRCodeDisplay } from '../components/qr/QRCodeDisplay';
import { ImageViewer } from '../components/gallery/ImageViewer';
import { VideoPlayer } from '../components/video/VideoPlayer';
import { PDFViewer } from '../components/pdf/PDFViewer';

export function RoomDashboard() {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    currentRoom,
    setCurrentRoom,
    connectSocket,
    tvOnline,
    saveRoomToHistory,
    activeViewer,
    openViewer,
    closeViewer,
    nextViewerFile,
    prevViewerFile,
    sendRemoteAction,
  } = useRoom();

  const [isLoading, setIsLoading] = useState(!currentRoom || currentRoom.roomCode !== code);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(searchParams.get('action') === 'upload');
  const [isRemoteOpen, setIsRemoteOpen] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isConnectTVOpen, setIsConnectTVOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Rename modal state
  const [renameTarget, setRenameTarget] = useState(null);
  const [newFileName, setNewFileName] = useState('');

  // Fetch / Connect to Room by code
  const loadRoom = useCallback(async () => {
    try {
      setIsLoading(true);
      const room = await apiClient.getRoomByCode(code);
      setCurrentRoom(room);
      connectSocket(room, 'mobile', 'Mobile Controller');
      saveRoomToHistory(room);
      setIsLoading(false);
    } catch (err) {
      console.error('[RoomDashboard] Error loading room:', err);
      showToast(err.message || 'Room not found or has ended', 'error');
      navigate('/');
    }
  }, [code, connectSocket, navigate, saveRoomToHistory, setCurrentRoom, showToast]);

  useEffect(() => {
    if (!currentRoom || currentRoom.roomCode !== code) {
      loadRoom();
    } else {
      setIsLoading(false);
      saveRoomToHistory(currentRoom);
    }
  }, [code, currentRoom, loadRoom, saveRoomToHistory]);

  const handleCopyCode = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.roomCode);
    setCopied(true);
    showToast('Room code copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Delete this file from the room?')) return;
    try {
      await apiClient.deleteFile(currentRoom.roomId, fileId, 'Mobile User');
      showToast('File deleted', 'info');
    } catch (err) {
      showToast(err.message || 'Failed to delete file', 'error');
    }
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!renameTarget || !newFileName.trim()) return;
    try {
      await apiClient.renameFile(
        currentRoom.roomId,
        renameTarget.fileId,
        newFileName.trim(),
        'Mobile User'
      );
      showToast('File renamed', 'success');
      setRenameTarget(null);
      setNewFileName('');
    } catch (err) {
      showToast(err.message || 'Failed to rename file', 'error');
    }
  };

  const files = currentRoom?.files || [];

  // Filter files
  const filteredFiles = files.filter((file) => {
    const matchesCategory =
      activeCategory === 'all' ||
      (activeCategory === 'image' && file.fileType === 'image') ||
      (activeCategory === 'video' && file.fileType === 'video') ||
      (activeCategory === 'pdf' && file.fileType === 'pdf');

    const matchesSearch =
      !searchQuery.trim() ||
      file.originalName.toLowerCase().includes(searchQuery.trim().toLowerCase());

    return matchesCategory && matchesSearch;
  });

  if (isLoading || !currentRoom) {
    return (
      <div className="min-h-screen bg-[#0a0d14] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        <p className="text-xs text-slate-400 font-mono">Connecting to Room {code}...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col justify-between selection:bg-brand-500 pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 px-5 py-4 border-b border-slate-800 bg-[#0a0d14]/90 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-extrabold text-base text-white">{currentRoom.name}</h1>
              <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-mono border border-slate-700">
                <span
                  className={`w-2 h-2 rounded-full ${
                    tvOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <span className={tvOnline ? 'text-emerald-300' : 'text-slate-400'}>
                  {tvOnline ? 'TV Live' : 'TV Offline'}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">Room Code: {currentRoom.roomCode}</p>
          </div>
        </div>

        {/* Quick Top Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyCode}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : currentRoom.roomCode}</span>
          </button>

          <button
            onClick={() => setIsQROpen(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Show QR Code"
          >
            <QrCode className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* TV Connection Status Banner (if offline) */}
        {!tvOnline && (
          <div
            onClick={() => setIsConnectTVOpen(true)}
            className="cursor-pointer p-4 rounded-3xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between hover:bg-amber-950/60 transition shadow-lg"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl">
                <Tv className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm">TV Not Connected Yet</h4>
                <p className="text-[11px] text-amber-200/80">Tap to show code & connect any Smart TV in seconds</p>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs">
              Connect TV
            </span>
          </div>
        )}

        {/* Mobile Quick Action Buttons Bar */}
        <div className="grid grid-cols-4 gap-2.5">
          {/* Upload Button */}
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-3xl bg-gradient-to-br from-brand-600 to-indigo-700 text-white shadow-xl shadow-brand-500/20 active:scale-95 transition"
          >
            <Upload className="w-5 h-5 sm:w-6 sm:h-6 mb-1" />
            <span className="font-extrabold text-[11px] sm:text-xs">Upload</span>
          </button>

          {/* Connect TV Button */}
          <button
            onClick={() => setIsConnectTVOpen(true)}
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-3xl bg-slate-900 border border-slate-800 text-white hover:bg-slate-800 active:scale-95 transition"
          >
            <Tv className="w-5 h-5 sm:w-6 sm:h-6 text-brand-400 mb-1" />
            <span className="font-bold text-[11px] sm:text-xs">Connect TV</span>
          </button>

          {/* TV Remote Button */}
          <button
            onClick={() => setIsRemoteOpen(true)}
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-3xl bg-slate-900 border border-slate-800 text-white hover:bg-slate-800 active:scale-95 transition"
          >
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400 mb-1" />
            <span className="font-bold text-[11px] sm:text-xs">Remote</span>
          </button>

          {/* Send Message Button */}
          <button
            onClick={() => setIsMessageOpen(true)}
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-3xl bg-slate-900 border border-slate-800 text-white hover:bg-slate-800 active:scale-95 transition"
          >
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 mb-1" />
            <span className="font-bold text-[11px] sm:text-xs">Message</span>
          </button>
        </div>

        {/* Search & Category Filter Section */}
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shared files by name..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'All Files', count: files.length },
              { id: 'image', label: 'Images', count: files.filter((f) => f.fileType === 'image').length },
              { id: 'video', label: 'Videos', count: files.filter((f) => f.fileType === 'video').length },
              { id: 'pdf', label: 'PDFs', count: files.filter((f) => f.fileType === 'pdf').length },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                  activeCategory === cat.id
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>{cat.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Shared Files List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
            <span>Shared Content ({filteredFiles.length})</span>
            <span>Sorted by newest</span>
          </div>

          {filteredFiles.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-950/40 border border-slate-800/80 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-slate-500 flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-sm">No files uploaded yet</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Tap the "Upload Files" button above to send photos, videos, or PDF documents to the TV.
              </p>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg shadow-brand-500/20 transition"
              >
                Upload First File
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredFiles.map((file, idx) => {
                const isImage = file.fileType === 'image';
                const isVideo = file.fileType === 'video';
                const isPdf = file.fileType === 'pdf';

                return (
                  <div
                    key={file.fileId}
                    className="group relative rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 overflow-hidden flex flex-col transition"
                  >
                    {/* Media Thumbnail */}
                    <div
                      onClick={() => openViewer(file, idx)}
                      className="relative aspect-video w-full bg-slate-950 overflow-hidden cursor-pointer flex items-center justify-center"
                    >
                      {isImage && (
                        <img
                          src={file.url}
                          alt={file.originalName}
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      )}
                      {isVideo && (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <video
                            src={`${file.url}#t=0.5`}
                            preload="metadata"
                            className="w-full h-full object-cover opacity-60"
                          />
                          <div className="w-10 h-10 rounded-full bg-brand-600/90 flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
                            <Film className="w-5 h-5" />
                          </div>
                        </div>
                      )}
                      {isPdf && (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-rose-950/20 text-rose-400">
                          <FileText className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-300">
                            PDF Document
                          </span>
                        </div>
                      )}
                    </div>

                    {/* File Meta Info */}
                    <div className="p-3.5 flex flex-col justify-between flex-1 space-y-2">
                      <div>
                        <h4
                          onClick={() => openViewer(file, idx)}
                          className="font-semibold text-white text-xs truncate cursor-pointer hover:text-brand-300"
                          title={file.originalName}
                        >
                          {file.originalName}
                        </h4>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
                          <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                          <span>{file.uploaderName || 'Mobile'}</span>
                        </div>
                      </div>

                      {/* Card Action Controls */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        {/* Remote trigger "Show on TV" */}
                        <button
                          onClick={() => sendRemoteAction('open-file', file.fileId)}
                          className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 flex items-center space-x-1 transition"
                        >
                          <Tv className="w-3 h-3" />
                          <span>Show on TV</span>
                        </button>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setRenameTarget(file);
                              setNewFileName(file.originalName);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg transition"
                            title="Rename"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file.fileId)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Upload Modal with Duplicate Prevention */}
      <FileUploadModal
        roomId={currentRoom.roomId}
        existingFiles={currentRoom.files || []}
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadComplete={() => {}}
      />

      {/* Virtual TV Remote Modal */}
      <VirtualTVRemote isOpen={isRemoteOpen} onClose={() => setIsRemoteOpen(false)} />

      {/* Message to TV Drawer */}
      <MessageDrawer
        roomId={currentRoom.roomId}
        messages={currentRoom.messages || []}
        isOpen={isMessageOpen}
        onClose={() => setIsMessageOpen(false)}
      />

      {/* QR Code Sharing Modal */}
      {isQROpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col items-center">
            <h3 className="font-bold text-white text-base mb-1">Room QR Code</h3>
            <p className="text-xs text-slate-400 mb-6 text-center">
              Scan to join and upload to this room
            </p>
            <QRCodeDisplay
              roomCode={currentRoom.roomCode}
              pairingToken={currentRoom.pairingToken}
              size={240}
              showDetails={true}
            />
            <button
              onClick={() => setIsQROpen(false)}
              className="mt-6 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Connect TV Modal */}
      {isConnectTVOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-brand-500/20 text-brand-400 rounded-2xl">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Connect Any Smart TV</h3>
                  <p className="text-xs text-slate-400">Samsung, LG, Android TV, Sony, Fire TV</p>
                </div>
              </div>
              <button
                onClick={() => setIsConnectTVOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Instructions */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start space-x-3">
                <span className="w-6 h-6 rounded-full bg-brand-600/30 text-brand-300 font-bold flex items-center justify-center shrink-0">1</span>
                <div>
                  <p className="font-semibold text-white">Open Browser on your Smart TV</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">Open the TV's Internet app (Samsung Internet, LG Web Browser, or Chrome).</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start space-x-3">
                <span className="w-6 h-6 rounded-full bg-sky-600/30 text-sky-300 font-bold flex items-center justify-center shrink-0">2</span>
                <div>
                  <p className="font-semibold text-white">Go to TV URL or Enter Code</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">Visit <strong className="text-sky-300 font-mono">{window.location.origin}/tv</strong> and enter:</p>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-2xl font-black font-mono tracking-widest text-brand-400 bg-slate-900 px-4 py-1.5 rounded-xl border border-brand-500/40">
                      {currentRoom.roomCode}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                    >
                      {copied ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start space-x-3">
                <span className="w-6 h-6 rounded-full bg-emerald-600/30 text-emerald-300 font-bold flex items-center justify-center shrink-0">3</span>
                <div>
                  <p className="font-semibold text-white">Or open Direct TV Link</p>
                  <p className="text-slate-400 text-[11px] mt-0.5 break-all font-mono text-[10px] bg-slate-900 p-2 rounded-xl border border-slate-800 mt-1">
                    {window.location.origin}/tv/{currentRoom.roomCode}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsConnectTVOpen(false)}
              className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg shadow-brand-500/20 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* File Rename Modal */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl">
            <h3 className="font-bold text-white text-base">Rename File</h3>
            <p className="text-xs text-slate-400 mt-1">Enter a new name for this file.</p>
            <form onSubmit={handleRenameSubmit} className="mt-4 space-y-4">
              <input
                type="text"
                autoFocus
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
              />
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-500/20"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Viewers */}
      {activeViewer && activeViewer.type === 'image' && (
        <ImageViewer
          file={activeViewer.file}
          files={files}
          currentIndex={activeViewer.index}
          onClose={closeViewer}
          onNext={nextViewerFile}
          onPrev={prevViewerFile}
          isTV={false}
        />
      )}

      {activeViewer && activeViewer.type === 'video' && (
        <VideoPlayer
          file={activeViewer.file}
          files={files}
          currentIndex={activeViewer.index}
          onClose={closeViewer}
          onNext={nextViewerFile}
          onPrev={prevViewerFile}
          isTV={false}
        />
      )}

      {activeViewer && activeViewer.type === 'pdf' && (
        <PDFViewer file={activeViewer.file} onClose={closeViewer} isTV={false} />
      )}
    </div>
  );
}

