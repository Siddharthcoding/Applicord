import { Router } from 'express';
import { reminderController } from '../controllers/reminderController';
import { authenticate } from '../middleware/auth';
import { checkReminderOwnership } from '../middleware/ownership';

const router = Router();

router.use(authenticate);

router.get('/', reminderController.list);
router.post('/', reminderController.create);
router.get('/calendar', reminderController.getCalendar);

router.patch('/:id', checkReminderOwnership, reminderController.update);
router.delete('/:id', checkReminderOwnership, reminderController.delete);

export default router;
