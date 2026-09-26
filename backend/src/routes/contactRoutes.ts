import { Router } from 'express';
import { contactController } from '../controllers/contactController';
import { authenticate } from '../middleware/auth';
import { checkContactOwnership } from '../middleware/ownership';

const router = Router();

router.use(authenticate);

router.get('/', contactController.list);
router.post('/', contactController.create);
router.patch('/:id', checkContactOwnership, contactController.update);
router.delete('/:id', checkContactOwnership, contactController.delete);

export default router;
