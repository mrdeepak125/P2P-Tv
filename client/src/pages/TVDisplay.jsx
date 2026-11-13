import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Tv,
  Users,
  Sparkles,
  RefreshCw,
  Power,
  Layers,
  ArrowRight,
  Wifi,
  Smartphone,
  PlusCircle,
  HelpCircle,
  MessageSquare,
  KeyRound,
  X,
  Keyboard,
} from 'lucide-react';
import { QRCodeDisplay } from '../components/qr/QRCodeDisplay';
import { TVCategoryTabs } from '../components/tv/TVCategoryTabs';
import { TVCardItem } from '../components/tv/TVCardItem';
import { TVRemoteHints } from '../components/tv/TVRemoteHints';
import { TVNotificationToast } from '../components/tv/TVNotificationToast';
import { ImageViewer } from '../components/gallery/ImageViewer';
import { VideoPlayer } from '../components/video/VideoPlayer';
import { PDFViewer } from '../components/pdf/PDFViewer';
import { useRoom } from '../context/RoomContext';
import { apiClient } from '../api/apiClient';
import { useToast } from '../context/ToastContext';
import { useTVNavigation } from '../hooks/useTVNavigation';

const CATEGORIES = ['all', 'image', 'video', 'pdf', 'messages'];
const SAFE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function TVDisplay() {
  const { code: urlCode } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    currentRoom,
    setCurrentRoom,
    connectSocket,
    saveTvSession,
    getSavedTvSession,
    activeViewer,
    setActiveViewer,
    openViewer,
    closeViewer,
    nextViewerFile,
    prevViewerFile,
    newFileIds,
  } = useRoom();

  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showManualCodeModal, setShowManualCodeModal] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Initialize TV Room: Check URL code, saved session, or create new
  const initializeTVRoom = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. If room code was passed in the URL (e.g. /tv/W62Y)
      if (urlCode && urlCode.length === 4) {
        const room = await apiClient.getRoomByCode(urlCode.toUpperCase());
        if (room) {
          setCurrentRoom(room);
          connectSocket(room, 'tv', 'Smart TV Display');
          saveTvSession(room);
          setIsLoading(false);
          return;
        }
      }

      // 2. Check saved persistent session
      const saved = getSavedTvSession();
      if (saved && saved.roomId) {
        const val = await apiClient.validateRoom({ roomId: saved.roomId });
        if (val && val.valid) {
          const room = await apiClient.getRoomById(saved.roomId, saved.pairingToken);
          setCurrentRoom(room);
          connectSocket(room, 'tv', 'Smart TV Display');
          saveTvSession(room);
          setIsLoading(false);
          return;
        }
      }

      // 3. Fallback: Create new TV room
      const newRoom = await apiClient.createRoom({
        name: 'Smart TV Room',
        createdBy: 'TV',
      });
      setCurrentRoom(newRoom);
      connectSocket(newRoom, 'tv', 'Smart TV Display');
      saveTvSession(newRoom);
      setIsLoading(false);
    } catch (err) {
      console.error('[TVDisplay] Initialization error:', err);
      showToast('Error connecting TV room. Retrying...', 'error');
      setIsLoading(false);
    }
  }, [urlCode, connectSocket, getSavedTvSession, saveTvSession, setCurrentRoom, showToast]);

  useEffect(() => {
    initializeTVRoom();
  }, [initializeTVRoom]);

  // Connect TV to an existing room created on mobile
  const handleJoinMobileRoom = async (targetCode) => {
    const clean = (targetCode || manualCode).trim().toUpperCase();
    if (clean.length !== 4) {
      showToast('Please enter a valid 4-character code', 'error');
      return;
    }

    try {
      setIsLoading(true);
      setShowManualCodeModal(false);
      const room = await apiClient.getRoomByCode(clean);
      setCurrentRoom(room);
      connectSocket(room, 'tv', 'Smart TV Display');
      saveTvSession(room);
      setIsLoading(false);
      showToast(`Connected to Mobile Room ${clean}!`, 'success');
      navigate(`/tv/${clean}`, { replace: true });
    } catch (err) {
      setIsLoading(false);
      showToast(err.message || 'Room not found. Check the code from mobile.', 'error');
    }
  };

  // Handle remote action events dispatched by mobile remote
  useEffect(() => {
    const handleRemoteAction = (e) => {
      const { action, payload } = e.detail;
      switch (action) {
        case 'arrow-left':
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
          break;
        case 'arrow-right':
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
          break;
        case 'arrow-up':
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
          break;
        case 'arrow-down':
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
          break;
        case 'enter':
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
          break;
        case 'back':
        case 'close-viewer':
          if (activeViewer) closeViewer();
          break;
        case 'toggle-play':
          window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
          break;
        case 'zoom-in':
          window.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }));
          break;
        case 'zoom-out':
          window.dispatchEvent(new KeyboardEvent('keydown', { key: '-' }));
          break;
        case 'zoom-reset':
          window.dispatchEvent(new KeyboardEvent('keydown', { key: '0' }));
          break;
        case 'open-file':
          if (payload && currentRoom?.files) {
            const found = currentRoom.files.find((f) => f.fileId === payload);
            if (found) openViewer(found);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('sr-tv-action', handleRemoteAction);
    return () => window.removeEventListener('sr-tv-action', handleRemoteAction);
  }, [activeViewer, closeViewer, currentRoom, openViewer]);

  // Filter files by selected category
  const allFiles = currentRoom?.files || [];
  const filteredFiles = allFiles.filter((f) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'image') return f.fileType === 'image';
    if (selectedCategory === 'video') return f.fileType === 'video';
    if (selectedCategory === 'pdf') return f.fileType === 'pdf';
    return true;
  });

  const categoryCounts = {
    all: allFiles.length,
    image: allFiles.filter((f) => f.fileType === 'image').length,
    video: allFiles.filter((f) => f.fileType === 'video').length,
    pdf: allFiles.filter((f) => f.fileType === 'pdf').length,
    messages: (currentRoom?.messages || []).length,
  };

  const currentTabIdx = CATEGORIES.indexOf(selectedCategory);

  // Dual-zone spatial TV Remote navigation (Tabs vs Grid)
  const {
    activeZone,
    setActiveZone,
    focusedIndex,
    setFocusedIndex,
    focusedTabIndex,
  } = useTVNavigation({
    itemCount: filteredFiles.length,
    columns: 4,
    tabsCount: CATEGORIES.length,
    currentTab: currentTabIdx >= 0 ? currentTabIdx : 0,
    isEnabled: !activeViewer && !showSettingsModal && !showManualCodeModal,
    onTabChange: (tabIdx) => {
      setSelectedCategory(CATEGORIES[tabIdx]);
    },
    onSelect: (index) => {
      const selected = filteredFiles[index];
      if (selected) {
        openViewer(selected, index);
      }
    },
    onBack: () => {
      setActiveZone('tabs');
    },
  });

  const onlineDevices = (currentRoom?.devices || []).filter((d) => d.isOnline);
  const mobileCount = onlineDevices.filter((d) => d.deviceType !== 'tv').length;

  const handleCreateNewRoom = async () => {
    try {
      setIsLoading(true);
      setShowSettingsModal(false);
      saveTvSession(null);
      const newRoom = await apiClient.createRoom({
        name: 'Smart TV Room',
        createdBy: 'TV',
      });
      setCurrentRoom(newRoom);
      connectSocket(newRoom, 'tv', 'Smart TV Display');
      saveTvSession(newRoom);
      setIsLoading(false);
      showToast('Created new TV room', 'success');
      navigate(`/tv/${newRoom.roomCode}`, { replace: true });
    } catch (err) {
      showToast('Failed to create new room', 'error');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-brand-500/20 text-brand-400 flex items-center justify-center animate-pulse border border-brand-500/30">
          <Tv className="w-8 h-8" />
        </div>
        <div className="text-xl font-black text-white tracking-wide">ScreenRoom TV</div>
        <p className="text-xs text-slate-400 font-mono">Connecting TV room session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-between selection:bg-brand-500 pb-14 overflow-hidden select-none relative">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-brand-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[300px] bg-sky-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* TV Header Bar */}
      <header className="px-10 py-6 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-500 to-sky-400 p-0.5 shadow-xl shadow-brand-500/20">
            <div className="w-full h-full bg-[#0a0d14] rounded-[14px] flex items-center justify-center">
              <Tv className="w-6 h-6 text-brand-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="font-black text-2xl tracking-tight text-white">ScreenRoom</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 text-xs font-bold uppercase">
                Smart TV
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Wireless Display & Remote Viewer</p>
          </div>
        </div>

        {/* Live Status & Room Code Pill */}
        <div className="flex items-center space-x-4">
          {/* Room Code Display */}
          <div className="flex items-center space-x-3 bg-slate-900/90 px-6 py-2.5 rounded-2xl border-2 border-brand-500/40 shadow-xl shadow-brand-500/10">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">TV Code:</span>
            <span className="text-3xl font-black font-mono tracking-widest text-brand-300">
              {currentRoom?.roomCode}
            </span>
          </div>

          {/* Connect to Mobile Code Button */}
          <button
            onClick={() => setShowManualCodeModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-800 text-xs font-bold transition shadow-sm"
            title="Enter code created on mobile"
          >
            <KeyRound className="w-4 h-4" />
            <span className="hidden sm:inline">Enter Phone Code</span>
          </button>

          {/* Connected Device Count */}
          <div className="flex items-center space-x-2.5 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800">
            <span
              className={`w-3 h-3 rounded-full ${
                mobileCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-xs font-semibold text-slate-200">
              {mobileCount > 0
                ? `${mobileCount} Device${mobileCount > 1 ? 's' : ''}`
                : 'Waiting for Mobile'}
            </span>
          </div>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
            title="Room Options"
          >
            <Power className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-10 py-6 overflow-y-auto z-10">
        {/* If no files uploaded yet: Show prominent TV pairing screen */}
        {allFiles.length === 0 ? (
          <div className="h-full flex items-center justify-center max-w-6xl mx-auto my-auto py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center w-full">
              {/* Left Column: Oversized QR Code */}
              <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-2xl backdrop-blur-md">
                <QRCodeDisplay
                  roomCode={currentRoom?.roomCode}
                  pairingToken={currentRoom?.pairingToken}
                  size={320}
                  showDetails={false}
                />
                <div className="mt-6 text-center">
                  <div className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                    Scan with any phone camera
                  </div>
                  <div className="text-4xl font-black font-mono tracking-widest text-brand-300 mt-2">
                    {currentRoom?.roomCode}
                  </div>
                </div>
              </div>

              {/* Right Column: Step-by-Step Instructions & Enter Mobile Code Option */}
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-bold mb-3">
                    <Sparkles className="w-4 h-4" />
                    <span>Instant Wireless Sharing • Internet Powered</span>
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tight">
                    Connect & Share to TV
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">
                    No app download required. Works across any network or internet.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex items-start space-x-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <div className="w-10 h-10 rounded-xl bg-brand-600/30 border border-brand-500/40 text-brand-300 font-black text-base flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">Scan TV QR Code</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Point your mobile camera at this QR code, or open ScreenRoom in your mobile browser.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start space-x-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/30 border border-sky-500/40 text-sky-300 font-black text-base flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">Created Room on Mobile?</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Already have a 4-digit code on your phone? Tap below to connect this TV!
                      </p>
                      <button
                        onClick={() => setShowManualCodeModal(true)}
                        className="mt-2.5 inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Enter Code From Mobile</span>
                      </button>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start space-x-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-black text-base flex items-center justify-center shrink-0">
                      3
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">Upload & Control</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Upload photos, videos, and PDFs. Navigate with remote control or mobile!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pulsing Waiting Indicator */}
                <div className="flex items-center space-x-3 p-4 rounded-2xl bg-brand-950/40 border border-brand-500/30">
                  <div className="w-3.5 h-3.5 rounded-full bg-brand-400 animate-ping" />
                  <span className="text-xs font-semibold text-brand-200">
                    Waiting for mobile phone to upload files...
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Gallery Mode */
          <div className="space-y-6">
            {/* Top Bar with Category Filter Tabs & File Count */}
            <div className="flex items-center justify-between">
              <TVCategoryTabs
                currentCategory={selectedCategory}
                onSelectCategory={(cat) => {
                  setSelectedCategory(cat);
                  setActiveZone('grid');
                }}
                counts={categoryCounts}
                isFocused={activeZone === 'tabs'}
                focusedTabIndex={focusedTabIndex}
              />
              <div className="text-xs font-mono text-slate-400">
                Showing <strong className="text-white">{filteredFiles.length}</strong> of{' '}
                <strong className="text-brand-300">{allFiles.length}</strong> files
              </div>
            </div>

            {/* Gallery Grid */}
            {selectedCategory === 'messages' ? (
              /* Messages View */
              <div className="max-w-2xl mx-auto space-y-3 py-6">
                {(currentRoom?.messages || []).length === 0 ? (
                  <div className="text-center py-16 text-slate-500 text-sm">No messages yet.</div>
                ) : (
                  (currentRoom?.messages || []).map((msg, i) => (
                    <div
                      key={msg.messageId || i}
                      className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-brand-300">{msg.senderName}</span>
                        <span className="font-mono text-slate-500">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-base font-medium text-white">{msg.text}</p>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Media Cards Grid (4 columns) */
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredFiles.map((file, index) => (
                  <TVCardItem
                    key={file.fileId}
                    file={file}
                    isFocused={activeZone === 'grid' && focusedIndex === index}
                    isNew={newFileIds.has(file.fileId)}
                    onSelect={() => openViewer(file, index)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* TV Remote Hints Bar (Bottom) */}
      <TVRemoteHints />

      {/* Non-intrusive TV Notification Toast (floating top-right) */}
      <TVNotificationToast />

      {/* Fullscreen Image Gallery Viewer */}
      {activeViewer && activeViewer.type === 'image' && (
        <ImageViewer
          file={activeViewer.file}
          files={allFiles}
          currentIndex={activeViewer.index}
          onClose={closeViewer}
          onNext={nextViewerFile}
          onPrev={prevViewerFile}
          isTV={true}
        />
      )}

      {/* HTML5 Video Player */}
      {activeViewer && activeViewer.type === 'video' && (
        <VideoPlayer
          file={activeViewer.file}
          files={allFiles}
          currentIndex={activeViewer.index}
          onClose={closeViewer}
          onNext={nextViewerFile}
          onPrev={prevViewerFile}
          isTV={true}
        />
      )}

      {/* Custom PDF Viewer */}
      {activeViewer && activeViewer.type === 'pdf' && (
        <PDFViewer file={activeViewer.file} onClose={closeViewer} isTV={true} />
      )}

      {/* TV Manual Enter Code Modal (Connect to room created on mobile) */}
      {showManualCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-brand-500/20 text-brand-400 rounded-xl">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-white text-lg">Enter Code from Phone</h3>
              </div>
              <button
                onClick={() => setShowManualCodeModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Type the 4-character code shown on your mobile device to display that room on this TV:
            </p>

            {/* Code Input */}
            <input
              type="text"
              maxLength={4}
              autoFocus
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="ABCD"
              className="w-full text-center tracking-[0.4em] font-mono font-black text-4xl py-4 rounded-2xl bg-slate-950 border-2 border-brand-500/60 text-brand-300 placeholder-slate-700 uppercase focus:outline-none focus:border-brand-400"
            />

            {/* On-Screen TV Remote Virtual Keypad for Remotes without keyboards */}
            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
              <div className="text-[10px] uppercase font-bold text-slate-400 px-1">
                TV Remote Quick Keypad:
              </div>
              <div className="grid grid-cols-8 gap-1.5 font-mono font-bold text-xs">
                {SAFE_CHARS.split('').map((ch) => (
                  <button
                    key={ch}
                    onClick={() => {
                      if (manualCode.length < 4) setManualCode((prev) => prev + ch);
                    }}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-brand-600 hover:text-white text-slate-200 border border-slate-800 transition active:scale-95"
                  >
                    {ch}
                  </button>
                ))}
              </div>
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => setManualCode((prev) => prev.slice(0, -1))}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-xs font-semibold text-slate-400 hover:text-rose-400 border border-slate-800"
                >
                  Backspace ⌫
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setShowManualCodeModal(false)}
                className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleJoinMobileRoom()}
                disabled={manualCode.trim().length !== 4}
                className="flex-1 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white font-extrabold text-xs shadow-lg shadow-brand-500/20 transition"
              >
                Connect TV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TV Settings / Disconnect Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-white text-lg">TV Room Options</h3>
            <p className="text-xs text-slate-400">
              Manage your TV room session. TV code survives refresh automatically.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleCreateNewRoom}
                className="w-full py-3.5 px-4 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/20 transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Room (New Code)</span>
              </button>

              <button
                onClick={() => {
                  saveTvSession(null);
                  window.location.reload();
                }}
                className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-rose-950/80 hover:text-rose-200 text-slate-300 font-semibold text-xs border border-slate-700 transition"
              >
                Disconnect & Clear Saved Session
              </button>

              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-3 px-4 rounded-2xl bg-slate-950 text-slate-400 font-semibold text-xs hover:text-white transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
