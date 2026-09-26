import { Router } from 'express';
import multer from 'multer';
import { importExportController } from '../controllers/importExportController';
import { authenticate } from '../middleware/auth';

const router = Router();
const uploadMemory = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

// Import endpoints
router.post('/parse-csv', uploadMemory.single('file'), importExportController.parseCsv);
router.post('/preview-import', importExportController.previewImport);
router.post('/execute-import', importExportController.executeImport);

// Export endpoints
router.get('/export-json', importExportController.exportJson);
router.get('/export-csv', importExportController.exportCsv);

export default router;
