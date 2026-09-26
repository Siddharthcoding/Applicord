import { Router } from 'express';
import { extensionController } from '../controllers/extensionController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/detect', extensionController.detect);
router.post('/track', extensionController.track);

export default router;
