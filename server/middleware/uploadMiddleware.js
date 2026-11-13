import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, '../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);
    const uniqueName = `${Date.now()}-${uuidv4().slice(0, 8)}-${safeBase}${ext}`;
    cb(null, uniqueName);
  },
});

// File filter for supported formats:
// Images: JPG, JPEG, PNG, WEBP, GIF
// Videos: MP4, WEBM, MOV
// Documents: PDF
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
]);

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file format: ${file.mimetype}. Allowed: Images (JPG, PNG, WEBP, GIF), Videos (MP4, WEBM, MOV), PDFs.`
      ),
      false
    );
  }
};

const maxFileSizeMB = parseInt(process.env.UPLOAD_MAX_SIZE_MB || '250', 10);

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSizeMB * 1024 * 1024,
    files: 20, // Max 20 files at once
  },
});

export function getFileType(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype === 'application/pdf') return 'pdf';
  return 'document';
}

