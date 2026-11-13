import express from 'express';
import { uploadFiles, streamMedia } from '../controllers/uploadController.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post('/', upload.array('files', 20), uploadFiles);
router.get('/stream/:filename', streamMedia);

export default router;

