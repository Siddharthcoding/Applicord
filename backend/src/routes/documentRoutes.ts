import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { documentController } from '../controllers/documentController';
import { authenticate } from '../middleware/auth';
import { checkDocumentOwnership } from '../middleware/ownership';
import { config } from '../config';

const router = Router();

// Ensure uploads directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/png',
      'image/jpeg',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Allowed: PDF, DOC, DOCX, TXT, PNG, JPEG.'));
    }
  },
});

router.use(authenticate);

router.get('/', documentController.list);
router.post('/upload', upload.single('file'), documentController.upload);
router.get('/:id/file', checkDocumentOwnership, documentController.download);
router.delete('/:id', checkDocumentOwnership, documentController.delete);

export default router;
