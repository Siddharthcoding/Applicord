import { Router } from 'express';
import { applicationController } from '../controllers/applicationController';
import { statusController } from '../controllers/statusController';
import { authenticate } from '../middleware/auth';
import { checkApplicationOwnership } from '../middleware/ownership';

const router = Router();

router.use(authenticate);

// List & Create
router.get('/', applicationController.list);
router.post('/', applicationController.create);

// Specialized / Auxiliary Application operations
router.get('/kanban', applicationController.getKanban);
router.post('/check-duplicate', applicationController.checkDuplicate);
router.post('/parse-url', applicationController.parseUrl);
router.post('/bulk-action', applicationController.bulkAction);
router.post('/correct-status', statusController.correctStatus);

// Single Application routes (with ownership check)
router.get('/:id', checkApplicationOwnership, applicationController.getById);
router.patch('/:id', checkApplicationOwnership, applicationController.update);
router.delete('/:id', checkApplicationOwnership, applicationController.delete);

// Status & Timeline sub-routes
router.post('/:id/status', checkApplicationOwnership, statusController.changeStatus);
router.get('/:id/timeline', checkApplicationOwnership, statusController.getTimeline);

export default router;
