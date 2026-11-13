import { roomStore } from '../services/roomStore.js';
import { generateId } from '../utils/codeGenerator.js';

/**
 * Send text message to room
 */
export async function sendMessage(req, res) {
  try {
    const { roomId, text, senderName = 'Mobile User', senderType = 'mobile' } = req.body;

    if (!roomId || !text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Room ID and message text are required' });
    }

    const room = await roomStore.findRoomById(roomId);
    if (!room || room.isEnded) {
      return res.status(404).json({ success: false, message: 'Room not found or has ended' });
    }

    const messageData = {
      messageId: generateId(),
      text: text.trim(),
      senderName,
      senderType,
      timestamp: new Date(),
    };

    await roomStore.addMessage(roomId, messageData);

    // Record activity
    const activity = {
      id: generateId(),
      type: 'message',
      description: `${senderName}: "${text.trim().slice(0, 40)}${text.trim().length > 40 ? '...' : ''}"`,
      timestamp: new Date(),
      actorName: senderName,
    };
    await roomStore.addActivity(roomId, activity);

    // Broadcast to room
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('new-message', {
        roomId,
        message: messageData,
        activity,
      });
    }

    return res.status(201).json({
      success: true,
      message: messageData,
    });
  } catch (error) {
    console.error('[MessageController] sendMessage error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send message' });
  }
}

