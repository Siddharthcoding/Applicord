import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/dashboard', analyticsController.getDashboardSummary);
router.get('/detailed', analyticsController.getDetailedAnalytics);

export default router;
