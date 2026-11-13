import { roomStore } from '../services/roomStore.js';

export function initializeSockets(io) {
  io.on('connection', (socket) => {
    let currentRoomId = null;
    let currentDeviceId = null;

    /**
     * Join Room event
     */
    socket.on('join-room', async (data, callback) => {
      try {
        const { roomId, roomCode, deviceId, deviceType = 'mobile', deviceName = 'Device' } = data;

        let targetRoomId = roomId;

        // If code provided instead of ID, resolve roomId
        if (!targetRoomId && roomCode) {
          const room = await roomStore.findRoomByCode(roomCode);
          if (room) targetRoomId = room.roomId;
        }

        if (!targetRoomId) {
          if (typeof callback === 'function') callback({ success: false, message: 'Invalid room' });
          return;
        }

        const room = await roomStore.findRoomById(targetRoomId);
        if (!room || room.isEnded) {
          if (typeof callback === 'function') callback({ success: false, message: 'Room has ended or does not exist' });
          return;
        }

        currentRoomId = targetRoomId;
        currentDeviceId = deviceId || socket.id;

        // Join Socket.IO room channel
        socket.join(targetRoomId);

        // Register device
        await roomStore.upsertDevice(targetRoomId, {
          deviceId: currentDeviceId,
          deviceName,
          deviceType,
          socketId: socket.id,
          isOnline: true,
        });

        // Broadcast device joined to everyone else in room
        socket.to(targetRoomId).emit('device-joined', {
          deviceId: currentDeviceId,
          deviceName,
          deviceType,
          socketId: socket.id,
          onlineCount: (room.devices || []).filter((d) => d.isOnline).length + 1,
        });

        if (typeof callback === 'function') {
          callback({
            success: true,
            room: {
              roomId: room.roomId,
              roomCode: room.roomCode,
              name: room.name,
              files: room.files || [],
              messages: room.messages || [],
              devices: room.devices || [],
            },
          });
        }
      } catch (err) {
        console.error('[Socket] join-room error:', err);
        if (typeof callback === 'function') callback({ success: false, message: err.message });
      }
    });

    /**
     * TV remote control action from mobile to TV
     * Actions: 'open-file', 'next', 'prev', 'zoom-in', 'zoom-out', 'toggle-slideshow', 'close-viewer', 'change-tab'
     */
    socket.on('tv-remote-action', (data) => {
      if (!currentRoomId) return;
      const { action, payload } = data;
      // Broadcast action to the TV in the same room
      socket.to(currentRoomId).emit('tv-remote-action', {
        action,
        payload,
        fromDeviceId: currentDeviceId,
        timestamp: Date.now(),
      });
    });

    /**
     * Heartbeat / Ping from TV or mobile
     */
    socket.on('heartbeat', async () => {
      if (currentRoomId && currentDeviceId) {
        // Keeps device active
      }
    });

    /**
     * Leave room
     */
    socket.on('leave-room', async () => {
      if (currentRoomId) {
        socket.leave(currentRoomId);
        await roomStore.handleSocketDisconnect(socket.id);
        socket.to(currentRoomId).emit('device-left', {
          deviceId: currentDeviceId,
          socketId: socket.id,
        });
        currentRoomId = null;
      }
    });

    /**
     * On disconnect
     */
    socket.on('disconnect', async () => {
      if (currentRoomId) {
        await roomStore.handleSocketDisconnect(socket.id);
        socket.to(currentRoomId).emit('device-left', {
          deviceId: currentDeviceId,
          socketId: socket.id,
        });
      }
    });
  });
}

