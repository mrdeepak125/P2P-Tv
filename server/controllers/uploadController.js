import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { roomStore } from '../services/roomStore.js';
import { getFileType } from '../middleware/uploadMiddleware.js';
import { generateId } from '../utils/codeGenerator.js';
import { isR2Configured, uploadToR2, getR2Stream, deleteFromR2 } from '../services/r2Storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, '../uploads');

/**
 * Handle multi-file upload with Cloudflare R2 support and Duplicate Detection
 */
export async function uploadFiles(req, res) {
  try {
    const { roomId } = req.body;
    const uploaderName = req.body.uploaderName || 'Mobile User';
    const uploaderId = req.body.uploaderId || '';

    if (!roomId) {
      return res.status(400).json({ success: false, message: 'Room ID is required' });
    }

    const room = await roomStore.findRoomById(roomId);
    if (!room || room.isEnded) {
      return res.status(404).json({ success: false, message: 'Room not found or has ended' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files were uploaded' });
    }

    const existingFiles = room.files || [];
    const newFiles = [];
    const skippedDuplicates = [];

    for (const file of req.files) {
      // Duplicate detection: compare originalName and size
      const isDuplicate = existingFiles.some(
        (ef) =>
          ef.originalName.toLowerCase() === file.originalname.toLowerCase() &&
          ef.size === file.size
      );

      if (isDuplicate) {
        skippedDuplicates.push(file.originalname);
        // Clean up temp disk file
        try {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch {}
        continue;
      }

      const fileType = getFileType(file.mimetype);
      const fileId = generateId();

      let fileUrl = `/uploads/${file.filename}`;
      let isR2Storage = false;

      // If Cloudflare R2 is configured, upload to R2
      if (isR2Configured()) {
        try {
          const r2Result = await uploadToR2({
            filePath: file.path,
            filename: file.filename,
            mimeType: file.mimetype,
          });
          fileUrl = r2Result.url;
          isR2Storage = true;
          console.log(`[Storage] Uploaded to Cloudflare R2: ${file.filename}`);
        } catch (r2Err) {
          console.warn(`[Storage] R2 upload error (${r2Err.message}), falling back to disk.`);
        }
      }

      const fileRecord = {
        fileId,
        originalName: file.originalname,
        filename: file.filename,
        mimeType: file.mimetype,
        fileType,
        size: file.size,
        url: fileUrl,
        storage: isR2Storage ? 'cloudflare-r2' : 'local-disk',
        uploadedAt: new Date(),
        uploaderName,
        uploaderId,
        version: 1,
      };

      await roomStore.addFile(roomId, fileRecord);
      newFiles.push(fileRecord);
      existingFiles.push(fileRecord); // prevent intra-batch duplicate
    }

    if (newFiles.length === 0 && skippedDuplicates.length > 0) {
      return res.status(200).json({
        success: true,
        files: [],
        skippedDuplicates,
        message: `All ${skippedDuplicates.length} file(s) were duplicates already in the room.`,
      });
    }

    // Record activity
    const activity = {
      id: generateId(),
      type: 'upload',
      description: `${uploaderName} uploaded ${newFiles.length} file${
        newFiles.length > 1 ? 's' : ''
      }${skippedDuplicates.length > 0 ? ` (${skippedDuplicates.length} duplicates skipped)` : ''}`,
      timestamp: new Date(),
      actorName: uploaderName,
    };
    await roomStore.addActivity(roomId, activity);

    // Notify connected TV & peers via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('files-uploaded', {
        roomId,
        files: newFiles,
        activity,
        uploaderName,
      });
    }

    return res.status(201).json({
      success: true,
      files: newFiles,
      skippedDuplicates,
      message: `Successfully uploaded ${newFiles.length} file(s)${
        skippedDuplicates.length > 0 ? ` (${skippedDuplicates.length} duplicates skipped)` : ''
      }`,
    });
  } catch (error) {
    console.error('[UploadController] uploadFiles error:', error);
    return res.status(500).json({ success: false, message: error.message || 'File upload failed' });
  }
}

/**
 * Stream media with HTTP Range Request support (206 Partial Content)
 * Handles both local disk storage and Cloudflare R2 streaming!
 */
export async function streamMedia(req, res) {
  try {
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    const filePath = path.join(UPLOAD_DIR, safeFilename);

    const ext = path.extname(safeFilename).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.mp4') contentType = 'video/mp4';
    else if (ext === '.webm') contentType = 'video/webm';
    else if (ext === '.mov') contentType = 'video/quicktime';
    else if (ext === '.pdf') contentType = 'application/pdf';
    else if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';

    const range = req.headers.range;

    // Check Cloudflare R2 first if configured and file not on local disk
    if (!fs.existsSync(filePath) && isR2Configured()) {
      try {
        const r2Response = await getR2Stream({ filename: safeFilename, range });
        res.writeHead(range ? 206 : 200, {
          'Content-Type': r2Response.ContentType || contentType,
          'Content-Length': r2Response.ContentLength,
          'Content-Range': r2Response.ContentRange,
          'Accept-Ranges': 'bytes',
        });
        r2Response.Body.pipe(res);
        return;
      } catch (r2Err) {
        console.warn(`[Stream] R2 stream error for ${safeFilename}:`, r2Err.message);
      }
    }

    // Local Disk streaming
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Media file not found');
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).send(`Requested range not satisfiable\n${start} >= ${fileSize}`);
        return;
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      };

      res.writeHead(206, head);
      fileStream.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error('[UploadController] streamMedia error:', error);
    res.status(500).send('Streaming error');
  }
}
