import mongoose from 'mongoose';

const FileSchema = new mongoose.Schema({
  fileId: { type: String, required: true },
  originalName: { type: String, required: true },
  filename: { type: String, required: true },
  mimeType: { type: String, required: true },
  fileType: { type: String, enum: ['image', 'video', 'pdf', 'document'], required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true },
  thumbnailUrl: { type: String },
  uploadedAt: { type: Date, default: Date.now },
  uploaderName: { type: String, default: 'Mobile Device' },
  uploaderId: { type: String },
  version: { type: Number, default: 1 },
});

const MessageSchema = new mongoose.Schema({
  messageId: { type: String, required: true },
  text: { type: String, required: true },
  senderName: { type: String, default: 'Mobile User' },
  senderType: { type: String, enum: ['mobile', 'tv', 'desktop'], default: 'mobile' },
  timestamp: { type: Date, default: Date.now },
});

const DeviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  deviceName: { type: String, default: 'Device' },
  deviceType: { type: String, enum: ['tv', 'mobile', 'desktop'], required: true },
  socketId: { type: String },
  isOnline: { type: Boolean, default: true },
  connectedAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
});

const ActivitySchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true }, // 'create', 'join', 'upload', 'message', 'delete', 'rename'
  description: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  actorName: { type: String, default: 'User' },
});

const RoomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    roomCode: { type: String, required: true, unique: true, index: true, uppercase: true },
    pairingToken: { type: String, required: true },
    name: { type: String, default: 'ScreenRoom' },
    createdBy: { type: String, default: 'TV' },
    isEnded: { type: Boolean, default: false },
    endedAt: { type: Date },
    lastActivity: { type: Date, default: Date.now },
    devices: [DeviceSchema],
    files: [FileSchema],
    messages: [MessageSchema],
    activities: [ActivitySchema],
    settings: {
      allowPublicUploads: { type: Boolean, default: true },
      autoPlayVideo: { type: Boolean, default: false },
      slideshowInterval: { type: Number, default: 5 }, // seconds
    },
  },
  {
    timestamps: true,
  }
);

export const RoomModel = mongoose.model('Room', RoomSchema);

