import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { roomStore } from '../services/roomStore.js';
import { generateRoomCode, generatePairingToken, generateId } from '../utils/codeGenerator.js';
import { deleteFromR2 } from '../services/r2Storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, '../uploads');

/**
 * Create a new room with a unique 4-character code and pairing token
 */
export async function createRoom(req, res) {
  try {
    const { name, createdBy = 'TV' } = req.body;

    // Generate unique 4-character code (retry if collision)
    let roomCode = generateRoomCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await roomStore.findRoomByCode(roomCode);
      if (!existing) break;
      roomCode = generateRoomCode();
      attempts++;
    }

    const roomId = generateId();
    const pairingToken = generatePairingToken();

    const roomData = {
      roomId,
      roomCode,
      pairingToken,
      name: name || `Room ${roomCode}`,
      createdBy,
      isEnded: false,
      devices: [],
      files: [],
      messages: [],
      activities: [
        {
          id: generateId(),
          type: 'create',
          description: `Room ${roomCode} created by ${createdBy}`,
          timestamp: new Date(),
          actorName: createdBy,
        },
      ],
      settings: {
        allowPublicUploads: true,
        autoPlayVideo: false,
        slideshowInterval: 5,
      },
    };

    const room = await roomStore.createRoom(roomData);

    return res.status(201).json({
      success: true,
      room: {
        roomId: room.roomId,
        roomCode: room.roomCode,
        pairingToken: room.pairingToken,
        name: room.name,
        createdBy: room.createdBy,
        createdAt: room.createdAt,
        filesCount: 0,
      },
    });
  } catch (error) {
    console.error('[RoomController] createRoom error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create room' });
  }
}

/**
 * Join / Lookup room by 4-character code
 */
export async function getRoomByCode(req, res) {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Room code is required' });
    }

    const room = await roomStore.findRoomByCode(code);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found or has ended' });
    }

    // Return room info (including pairing token for valid connection)
    return res.json({
      success: true,
      room: {
        roomId: room.roomId,
        roomCode: room.roomCode,
        pairingToken: room.pairingToken,
        name: room.name,
        createdAt: room.createdAt,
        lastActivity: room.lastActivity,
        files: room.files || [],
        messages: room.messages || [],
        devices: (room.devices || []).map((d) => ({
          deviceId: d.deviceId,
          deviceName: d.deviceName,
          deviceType: d.deviceType,
          isOnline: d.isOnline,
        })),
        settings: room.settings,
      },
    });
  } catch (error) {
    console.error('[RoomController] getRoomByCode error:', error);
    return res.status(500).json({ success: false, message: 'Failed to find room' });
  }
}

/**
 * Get room by roomId (with optional token verification)
 */
export async function getRoomById(req, res) {
  try {
    const { roomId } = req.params;
    const token = req.headers['x-pairing-token'] || req.query.token;

    const room = await roomStore.findRoomById(roomId);
    if (!room || room.isEnded) {
      return res.status(404).json({ success: false, message: 'Room not found or has ended' });
    }

    return res.json({
      success: true,
      room: {
        roomId: room.roomId,
        roomCode: room.roomCode,
        pairingToken: room.pairingToken,
        name: room.name,
        createdAt: room.createdAt,
        lastActivity: room.lastActivity,
        files: room.files || [],
        messages: room.messages || [],
        activities: room.activities || [],
        devices: room.devices || [],
        settings: room.settings,
      },
    });
  } catch (error) {
    console.error('[RoomController] getRoomById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve room' });
  }
}

/**
 * Validate room existence and status (for auto-reconnect)
 */
export async function validateRoom(req, res) {
  try {
    const { roomId, roomCode } = req.query;

    let room = null;
    if (roomId) {
      room = await roomStore.findRoomById(roomId);
    } else if (roomCode) {
      room = await roomStore.findRoomByCode(roomCode);
    }

    if (!room || room.isEnded) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: 'Room is invalid or has expired',
      });
    }

    return res.json({
      success: true,
      valid: true,
      room: {
        roomId: room.roomId,
        roomCode: room.roomCode,
        name: room.name,
        filesCount: (room.files || []).length,
        devicesCount: (room.devices || []).filter((d) => d.isOnline).length,
      },
    });
  } catch (error) {
    console.error('[RoomController] validateRoom error:', error);
    return res.status(500).json({ success: false, valid: false, message: 'Validation error' });
  }
}

/**
 * End an existing room
 */
export async function endRoom(req, res) {
  try {
    const { roomId } = req.params;
    const room = await roomStore.findRoomById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    await roomStore.endRoom(roomId);

    // Notify connected sockets via IO
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('room-ended', { roomId, message: 'Room has been ended by the host' });
    }

    return res.json({ success: true, message: 'Room ended successfully' });
  } catch (error) {
    console.error('[RoomController] endRoom error:', error);
    return res.status(500).json({ success: false, message: 'Failed to end room' });
  }
}

/**
 * Delete a file from room
 */
export async function deleteFile(req, res) {
  try {
    const { roomId, fileId } = req.params;
    const room = await roomStore.findRoomById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const file = (room.files || []).find((f) => f.fileId === fileId);
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    await roomStore.removeFile(roomId, fileId);

    // Try deleting physical file from disk and Cloudflare R2
    try {
      const filePath = path.join(UPLOAD_DIR, file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await deleteFromR2(file.filename);
    } catch (e) {
      console.warn('[RoomController] Could not delete file:', e.message);
    }

    // Record activity
    const activity = {
      id: generateId(),
      type: 'delete',
      description: `File "${file.originalName}" was deleted`,
      timestamp: new Date(),
      actorName: req.body.userName || 'User',
    };
    await roomStore.addActivity(roomId, activity);

    // Notify via Socket
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('file-deleted', { fileId, activity });
    }

    return res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    console.error('[RoomController] deleteFile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete file' });
  }
}

/**
 * Rename a file
 */
export async function renameFile(req, res) {
  try {
    const { roomId, fileId } = req.params;
    const { newName, userName } = req.body;

    if (!newName || !newName.trim()) {
      return res.status(400).json({ success: false, message: 'New name is required' });
    }

    const updatedRoom = await roomStore.renameFile(roomId, fileId, newName.trim());
    if (!updatedRoom) {
      return res.status(404).json({ success: false, message: 'Room or file not found' });
    }

    const file = updatedRoom.files.find((f) => f.fileId === fileId);

    const activity = {
      id: generateId(),
      type: 'rename',
      description: `File renamed to "${newName.trim()}"`,
      timestamp: new Date(),
      actorName: userName || 'User',
    };
    await roomStore.addActivity(roomId, activity);

    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('file-renamed', { fileId, newName: newName.trim(), file, activity });
    }

    return res.json({ success: true, file });
  } catch (error) {
    console.error('[RoomController] renameFile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to rename file' });
  }
}

/**
 * Get room activity & file history
 */
export async function getRoomHistory(req, res) {
  try {
    const { roomId } = req.params;
    const room = await roomStore.findRoomById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    return res.json({
      success: true,
      files: room.files || [],
      messages: room.messages || [],
      activities: room.activities || [],
    });
  } catch (error) {
    console.error('[RoomController] getRoomHistory error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve history' });
  }
}

