import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { apiClient } from '../api/apiClient';
import { useToast } from './ToastContext';

const RoomContext = createContext(null);

const SAVED_ROOMS_KEY = 'screenroom_saved_rooms';
const TV_SESSION_KEY = 'screenroom_tv_session';
const DEVICE_ID_KEY = 'screenroom_device_id';

function getOrCreateDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function RoomProvider({ children }) {
  const { showToast } = useToast();
  const [currentRoom, setCurrentRoom] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [tvOnline, setTvOnline] = useState(false);
  const [savedRooms, setSavedRooms] = useState(() => {
    try {
      const data = localStorage.getItem(SAVED_ROOMS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  // Active fullscreen media viewer (image, video, pdf)
  const [activeViewer, setActiveViewer] = useState(null); // { type, file, index }

  // New files notification tracker
  const [newFileIds, setNewFileIds] = useState(new Set());

  // Socket reference
  const socketRef = useRef(null);
  const deviceId = useRef(getOrCreateDeviceId());

  // Save room to mobile history
  const saveRoomToHistory = useCallback((room) => {
    if (!room || !room.roomId) return;
    setSavedRooms((prev) => {
      const existing = prev.filter((r) => r.roomId !== room.roomId);
      const updated = [
        {
          roomId: room.roomId,
          roomCode: room.roomCode,
          name: room.name,
          lastConnected: new Date().toISOString(),
          filesCount: (room.files || []).length,
          tvOnline: true,
        },
        ...existing,
      ].slice(0, 10); // keep up to 10 recent rooms
      localStorage.setItem(SAVED_ROOMS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Remove saved room from history
  const removeSavedRoom = useCallback((roomId) => {
    setSavedRooms((prev) => {
      const updated = prev.filter((r) => r.roomId !== roomId);
      localStorage.setItem(SAVED_ROOMS_KEY, JSON.stringify(updated));
      return updated;
    });
    showToast('Room removed from history', 'info');
  }, [showToast]);

  // TV Session persistence
  const saveTvSession = useCallback((room) => {
    if (!room) {
      localStorage.removeItem(TV_SESSION_KEY);
    } else {
      localStorage.setItem(
        TV_SESSION_KEY,
        JSON.stringify({
          roomId: room.roomId,
          roomCode: room.roomCode,
          pairingToken: room.pairingToken,
          name: room.name,
        })
      );
    }
  }, []);

  const getSavedTvSession = useCallback(() => {
    try {
      const raw = localStorage.getItem(TV_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  // Initialize or connect Socket
  const connectSocket = useCallback((room, deviceType = 'mobile', deviceName = 'Device') => {
    if (!room) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const backendUrl =
      import.meta.env.VITE_BACKEND_URL ||
      (typeof window !== 'undefined' && window.location.port === '3000'
        ? `${window.location.protocol}//${window.location.hostname}:5000`
        : '');

    const socket = io(backendUrl || undefined, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join-room', {
        roomId: room.roomId,
        roomCode: room.roomCode,
        deviceId: deviceId.current,
        deviceType,
        deviceName,
        pairingToken: room.pairingToken,
      }, (res) => {
        if (res && res.success) {
          // If TV is present in room, set tvOnline
          const tvPresent = (res.room.devices || []).some(
            (d) => d.deviceType === 'tv' && d.isOnline
          );
          setTvOnline(tvPresent || deviceType === 'tv');
        }
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Device joined
    socket.on('device-joined', (data) => {
      if (data.deviceType === 'tv') setTvOnline(true);
      showToast(`${data.deviceName || data.deviceType} joined the room`, 'info', 2500);
      setCurrentRoom((prev) => {
        if (!prev) return null;
        const devices = [...(prev.devices || [])];
        const idx = devices.findIndex((d) => d.deviceId === data.deviceId);
        if (idx >= 0) {
          devices[idx] = { ...devices[idx], isOnline: true };
        } else {
          devices.push({ ...data, isOnline: true });
        }
        return { ...prev, devices };
      });
    });

    // Device left
    socket.on('device-left', (data) => {
      setCurrentRoom((prev) => {
        if (!prev) return null;
        const devices = (prev.devices || []).map((d) =>
          d.deviceId === data.deviceId || d.socketId === data.socketId
            ? { ...d, isOnline: false }
            : d
        );
        const tvPresent = devices.some((d) => d.deviceType === 'tv' && d.isOnline);
        setTvOnline(tvPresent);
        return { ...prev, devices };
      });
    });

    // Real-time files uploaded
    socket.on('files-uploaded', (data) => {
      const { files, uploaderName } = data;
      showToast(`${uploaderName || 'Device'} uploaded ${files.length} new file(s)!`, 'success');

      // Track newly added IDs for "NEW" indicator
      setNewFileIds((prev) => {
        const next = new Set(prev);
        files.forEach((f) => next.add(f.fileId));
        return next;
      });

      setCurrentRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          files: [...(prev.files || []), ...files],
          activities: [data.activity, ...(prev.activities || [])],
        };
      });
    });

    // File deleted
    socket.on('file-deleted', ({ fileId, activity }) => {
      showToast('File was removed', 'info');
      setCurrentRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          files: (prev.files || []).filter((f) => f.fileId !== fileId),
          activities: [activity, ...(prev.activities || [])],
        };
      });
      setActiveViewer((prev) => (prev && prev.file && prev.file.fileId === fileId ? null : prev));
    });

    // File renamed
    socket.on('file-renamed', ({ fileId, newName, file, activity }) => {
      setCurrentRoom((prev) => {
        if (!prev) return null;
        const files = (prev.files || []).map((f) => (f.fileId === fileId ? { ...f, originalName: newName } : f));
        return {
          ...prev,
          files,
          activities: [activity, ...(prev.activities || [])],
        };
      });
    });

    // New message
    socket.on('new-message', ({ message, activity }) => {
      showToast(`💬 ${message.senderName}: ${message.text}`, 'message', 5000);
      setCurrentRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...(prev.messages || []), message],
          activities: [activity, ...(prev.activities || [])],
        };
      });
    });

    // TV remote control actions received on TV
    socket.on('tv-remote-action', ({ action, payload }) => {
      // Handled via event dispatch or callback
      window.dispatchEvent(new CustomEvent('sr-tv-action', { detail: { action, payload } }));
    });

    // Room ended
    socket.on('room-ended', () => {
      showToast('This room has been ended by the host', 'error', 6000);
      setCurrentRoom((prev) => (prev ? { ...prev, isEnded: true } : null));
    });
  }, [showToast]);

  // Send virtual remote command to TV
  const sendRemoteAction = useCallback((action, payload = null) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('tv-remote-action', { action, payload });
      showToast(`Sent TV command: ${action}`, 'info', 1500);
    }
  }, [isConnected, showToast]);

  // Open media viewer
  const openViewer = useCallback((file, index = 0) => {
    if (!file) return;
    setActiveViewer({
      file,
      index,
      type: file.fileType || 'image',
    });
  }, []);

  const closeViewer = useCallback(() => {
    setActiveViewer(null);
  }, []);

  // Viewer navigation
  const nextViewerFile = useCallback(() => {
    if (!currentRoom || !currentRoom.files || !activeViewer) return;
    const sameTypeFiles = currentRoom.files.filter((f) => f.fileType === activeViewer.type);
    if (sameTypeFiles.length <= 1) return;
    const currentIdx = sameTypeFiles.findIndex((f) => f.fileId === activeViewer.file.fileId);
    const nextIdx = (currentIdx + 1) % sameTypeFiles.length;
    setActiveViewer({
      type: activeViewer.type,
      file: sameTypeFiles[nextIdx],
      index: nextIdx,
    });
  }, [currentRoom, activeViewer]);

  const prevViewerFile = useCallback(() => {
    if (!currentRoom || !currentRoom.files || !activeViewer) return;
    const sameTypeFiles = currentRoom.files.filter((f) => f.fileType === activeViewer.type);
    if (sameTypeFiles.length <= 1) return;
    const currentIdx = sameTypeFiles.findIndex((f) => f.fileId === activeViewer.file.fileId);
    const prevIdx = (currentIdx - 1 + sameTypeFiles.length) % sameTypeFiles.length;
    setActiveViewer({
      type: activeViewer.type,
      file: sameTypeFiles[prevIdx],
      index: prevIdx,
    });
  }, [currentRoom, activeViewer]);

  // Clean up socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <RoomContext.Provider
      value={{
        currentRoom,
        setCurrentRoom,
        isConnected,
        tvOnline,
        setTvOnline,
        savedRooms,
        saveRoomToHistory,
        removeSavedRoom,
        saveTvSession,
        getSavedTvSession,
        connectSocket,
        sendRemoteAction,
        activeViewer,
        setActiveViewer,
        openViewer,
        closeViewer,
        nextViewerFile,
        prevViewerFile,
        newFileIds,
        deviceId: deviceId.current,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const context = useContext(RoomContext);
  if (!context) throw new Error('useRoom must be used within RoomProvider');
  return context;
}

