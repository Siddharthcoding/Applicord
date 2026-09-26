import { Router } from 'express';
import { auditController } from '../controllers/auditController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', auditController.getLogs);

export default router;
