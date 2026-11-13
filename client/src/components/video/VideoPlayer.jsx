import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Film,
} from 'lucide-react';

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function VideoPlayer({
  file,
  files = [],
  currentIndex = 0,
  onClose,
  onNext,
  onPrev,
  isTV = false,
}) {
  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const controlsTimeoutRef = useRef(null);
  const videoFiles = files.filter((f) => f.fileType === 'video');
  const totalVideos = videoFiles.length || 1;
  const currentPos = videoFiles.findIndex((f) => f.fileId === file.fileId);
  const displayIndex = currentPos >= 0 ? currentPos + 1 : currentIndex + 1;

  // Autohide controls on inactivity
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  }, [isPlaying]);

  // Toggle play/pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    resetControlsTimeout();
  };

  // Seek
  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  // Speed
  const handleSpeedChange = (speed) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  };

  // Volume
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setVolume(val);
      setIsMuted(val === 0);
    }
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Keyboard & TV Remote controls
  const handleKeyDown = useCallback(
    (e) => {
      resetControlsTimeout();
      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (videoRef.current) {
            const nextVol = Math.min(1, videoRef.current.volume + 0.1);
            videoRef.current.volume = nextVol;
            setVolume(nextVol);
            setIsMuted(false);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (videoRef.current) {
            const prevVol = Math.max(0, videoRef.current.volume - 0.1);
            videoRef.current.volume = prevVol;
            setVolume(prevVol);
            if (prevVol === 0) setIsMuted(true);
          }
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          if (onClose) onClose();
          break;
        default:
          break;
      }
    },
    [duration, onClose, isPlaying, resetControlsTimeout]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={resetControlsTimeout}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none animate-fadeIn"
    >
      {/* Video Stream Element */}
      <video
        ref={videoRef}
        src={file.url}
        playsInline
        autoPlay
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onLoadedMetadata={() => {
          setDuration(videoRef.current?.duration || 0);
          setIsPlaying(true);
        }}
        onClick={togglePlay}
        className="w-full h-full max-h-screen object-contain"
      />

      {/* Top Header Overlay */}
      <div
        className={`absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/80 to-transparent px-6 flex items-center justify-between transition-opacity duration-300 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
            <Film className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h2 className="text-sm md:text-base font-medium text-white truncate max-w-lg">
              {file.originalName}
            </h2>
            <p className="text-xs text-slate-400">
              Video {displayIndex} of {totalVideos}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 border border-slate-700/80 transition"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Controls Overlay */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 transition-opacity duration-300 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Seek Bar */}
        <div className="flex items-center space-x-3 mb-4">
          <span className="text-xs font-mono text-slate-300 min-w-[40px]">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
          />
          <span className="text-xs font-mono text-slate-400 min-w-[40px]">
            {formatTime(duration)}
          </span>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Prev Video */}
            {totalVideos > 1 && (
              <button
                onClick={onPrev}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
                title="Previous Video"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="p-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/30 transition transform hover:scale-105"
              title="Play/Pause (Space)"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            {/* Next Video */}
            {totalVideos > 1 && (
              <button
                onClick={onNext}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
                title="Next Video"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Volume Control */}
            <div className="flex items-center space-x-2 ml-2">
              <button
                onClick={toggleMute}
                className="p-2 text-slate-300 hover:text-white transition"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-rose-400" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-400 hidden sm:block"
              />
            </div>
          </div>

          {/* Right Toolbar Options */}
          <div className="flex items-center space-x-3">
            {/* Speed Selector */}
            <div className="flex items-center bg-slate-900/80 border border-slate-700/80 rounded-xl p-1 text-xs">
              {[1, 1.5, 2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => handleSpeedChange(spd)}
                  className={`px-2 py-1 rounded-lg transition font-mono ${
                    playbackSpeed === spd
                      ? 'bg-brand-600 text-white font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* TV Remote Hints */}
        {isTV && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>[ENTER] Play/Pause</span>
            <span>[◀ ▶] Seek 5s</span>
            <span>[▲ ▼] Volume</span>
            <span>[BACK] Return to Gallery</span>
          </div>
        )}
      </div>
    </div>
  );
}

