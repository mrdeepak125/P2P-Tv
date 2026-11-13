import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getIsMongoConnected } from '../config/db.js';
import { RoomModel } from '../models/RoomSchema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const STORE_FILE = path.join(DATA_DIR, 'rooms.json');

// Ensure data directory and initial storage file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(STORE_FILE)) {
  fs.writeFileSync(STORE_FILE, JSON.stringify({ rooms: {} }, null, 2), 'utf-8');
}

/**
 * File-backed persistence helpers
 */
function readLocalStore() {
  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[Store] Error reading local store:', err);
    return { rooms: {} };
  }
}

function writeLocalStore(data) {
  try {
    const tempFile = `${STORE_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, STORE_FILE);
  } catch (err) {
    console.error('[Store] Error writing local store:', err);
  }
}

export const roomStore = {
  /**
   * Create a new room
   */
  async createRoom(roomData) {
    if (getIsMongoConnected()) {
      const room = new RoomModel(roomData);
      await room.save();
      return room.toObject();
    } else {
      const store = readLocalStore();
      store.rooms[roomData.roomId] = {
        ...roomData,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivity: new Date(),
        devices: roomData.devices || [],
        files: roomData.files || [],
        messages: roomData.messages || [],
        activities: roomData.activities || [],
      };
      writeLocalStore(store);
      return store.rooms[roomData.roomId];
    }
  },

  /**
   * Find room by 4-character roomCode (case-insensitive)
   */
  async findRoomByCode(code) {
    if (!code) return null;
    const cleanCode = code.trim().toUpperCase();

    if (getIsMongoConnected()) {
      const room = await RoomModel.findOne({ roomCode: cleanCode, isEnded: false });
      return room ? room.toObject() : null;
    } else {
      const store = readLocalStore();
      const found = Object.values(store.rooms).find(
        (r) => r.roomCode === cleanCode && !r.isEnded
      );
      return found || null;
    }
  },

  /**
   * Find room by roomId
   */
  async findRoomById(roomId) {
    if (!roomId) return null;

    if (getIsMongoConnected()) {
      const room = await RoomModel.findOne({ roomId });
      return room ? room.toObject() : null;
    } else {
      const store = readLocalStore();
      return store.rooms[roomId] || null;
    }
  },

  /**
   * Update room metadata
   */
  async updateRoom(roomId, updates) {
    if (getIsMongoConnected()) {
      const room = await RoomModel.findOneAndUpdate(
        { roomId },
        { ...updates, lastActivity: new Date() },
        { new: true }
      );
      return room ? room.toObject() : null;
    } else {
      const store = readLocalStore();
      if (!store.rooms[roomId]) return null;
      store.rooms[roomId] = {
        ...store.rooms[roomId],
        ...updates,
        lastActivity: new Date(),
        updatedAt: new Date(),
      };
      writeLocalStore(store);
      return store.rooms[roomId];
    }
  },

  /**
   * Add file to room
   */
  async addFile(roomId, fileData) {
    if (getIsMongoConnected()) {
      const room = await RoomModel.findOneAndUpdate(
        { roomId },
        {
          $push: { files: fileData },
          $set: { lastActivity: new Date() },
        },
        { new: true }
      );
      return room ? room.toObject() : null;
    } else {
      const store = readLocalStore();
      const room = store.rooms[roomId];
      if (!room) return null;
      room.files.push(fileData);
      room.lastActivity = new Date();
      room.updatedAt = new Date();
      writeLocalStore(store);
      return room;
    }
  },

  /**
   * Remove file from room
   */
  async removeFile(roomId, fileId) {
    if (getIsMongoConnected()) {
      const room = await RoomModel.findOneAndUpdate(
        { roomId },
        {
          $pull: { files: { fileId } },
          $set: { lastActivity: new Date() },
        },
        { new: true }
      );
      return room ? room.toObject() : null;
    } else {
      const store = readLocalStore();
      const room = store.rooms[roomId];
      if (!room) return null;
      room.files = room.files.filter((f) => f.fileId !== fileId);
      room.lastActivity = new Date();
      room.updatedAt = new Date();
      writeLocalStore(store);
      return room;
    }
  },

  /**
   * Rename file in room
   */
  async renameFile(roomId, fileId, newName) {
    if (getIsMongoConnected()) {
      const room = await RoomModel.findOneAndUpdate(
        { roomId, 'files.fileId': fileId },
        {
          $set: {
            'files.$.originalName': newName,
            lastActivity: new Date(),
          },
        },
        { new: true }
      );
      return room ? room.toObject() : null;
    } else {
      const store = readLocalStore();
      const room = store.rooms[roomId];
      if (!room) return null;
      const file = room.files.find((f) => f.fileId === fileId);
      if (file) {
        file.originalName = newName;
        file.version = (file.version || 1) + 1;
      }
      room.lastActivity = new Date();
      room.updatedAt = new Date();
      writeLocalStore(store);
      return room;
    }
  },

  /**
   * Add message to room
   */
  async addMessage(roomId, messageData) {
    if (getIsMongoConnected()) {
      const room = await RoomModel.findOneAndUpdate(
        { roomId },
        {
          $push: { messages: messageData },
          $set: { lastActivity: new Date() },
        },
        { new: true }
      );
      return room ? room.toObject() : null;
    } else {
      const store = readLocalStore();
      const room = store.rooms[roomId];
      if (!room) return null;
      room.messages.push(messageData);
      room.lastActivity = new Date();
      room.updatedAt = new Date();
      writeLocalStore(store);
      return room;
    }
  },

  /**
   * Add activity log entry to room
   */
  async addActivity(roomId, activityData) {
    if (getIsMongoConnected()) {
      const room = await RoomModel.findOneAndUpdate(
        { roomId },
        {
          $push: {
            activities: {
              $each: [activityData],
              $slice: -100, // keep latest 100 activities
            },
          },
          $set: { lastActivity: new Date() },
        },
        { new: true }
      );
      return room ? room.toObject() : null;
    } else {
      const store = readLocalStore();
      const room = store.rooms[roomId];
      if (!room) return null;
      room.activities = room.activities || [];
      room.activities.push(activityData);
      if (room.activities.length > 100) {
        room.activities = room.activities.slice(-100);
      }
      room.lastActivity = new Date();
      room.updatedAt = new Date();
      writeLocalStore(store);
      return room;
    }
  },

  /**
   * Upsert connected device
   */
  async upsertDevice(roomId, deviceData) {
    if (getIsMongoConnected()) {
      const room = await RoomModel.findOne({ roomId });
      if (!room) return null;
      const existingIdx = room.devices.findIndex(
        (d) => d.deviceId === deviceData.deviceId
      );
      if (existingIdx >= 0) {
        room.devices[existingIdx] = {
          ...room.devices[existingIdx].toObject(),
          ...deviceData,
          isOnline: true,
          lastSeen: new Date(),
        };
      } else {
        room.devices.push({
          ...deviceData,
          isOnline: true,
          connectedAt: new Date(),
          lastSeen: new Date(),
        });
      }
      room.lastActivity = new Date();
      await room.save();
      return room.toObject();
    } else {
      const store = readLocalStore();
      const room = store.rooms[roomId];
      if (!room) return null;
      room.devices = room.devices || [];
      const idx = room.devices.findIndex((d) => d.deviceId === deviceData.deviceId);
      if (idx >= 0) {
        room.devices[idx] = {
          ...room.devices[idx],
          ...deviceData,
          isOnline: true,
          lastSeen: new Date(),
        };
      } else {
        room.devices.push({
          ...deviceData,
          isOnline: true,
          connectedAt: new Date(),
          lastSeen: new Date(),
        });
      }
      room.lastActivity = new Date();
      room.updatedAt = new Date();
      writeLocalStore(store);
      return room;
    }
  },

  /**
   * Handle device disconnect by socketId
   */
  async handleSocketDisconnect(socketId) {
    if (getIsMongoConnected()) {
      const rooms = await RoomModel.find({ 'devices.socketId': socketId });
      for (const room of rooms) {
        let changed = false;
        room.devices.forEach((d) => {
          if (d.socketId === socketId) {
            d.isOnline = false;
            d.lastSeen = new Date();
            changed = true;
          }
        });
        if (changed) {
          await room.save();
        }
      }
    } else {
      const store = readLocalStore();
      let changed = false;
      Object.values(store.rooms).forEach((room) => {
        if (room.devices) {
          room.devices.forEach((d) => {
            if (d.socketId === socketId) {
              d.isOnline = false;
              d.lastSeen = new Date();
              changed = true;
            }
          });
        }
      });
      if (changed) {
        writeLocalStore(store);
      }
    }
  },

  /**
   * End room
   */
  async endRoom(roomId) {
    return await this.updateRoom(roomId, {
      isEnded: true,
      endedAt: new Date(),
    });
  },
};

