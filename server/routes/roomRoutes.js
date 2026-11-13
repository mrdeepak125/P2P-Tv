import express from 'express';
import {
  createRoom,
  getRoomByCode,
  getRoomById,
  validateRoom,
  endRoom,
  deleteFile,
  renameFile,
  getRoomHistory,
} from '../controllers/roomController.js';
import { createRoomLimiter, joinRoomLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/', createRoomLimiter, createRoom);
router.get('/validate', validateRoom);
router.get('/code/:code', joinRoomLimiter, getRoomByCode);
router.get('/:roomId', getRoomById);
router.get('/:roomId/history', getRoomHistory);
router.post('/:roomId/end', endRoom);
router.delete('/:roomId/files/:fileId', deleteFile);
router.patch('/:roomId/files/:fileId', renameFile);

export default router;

