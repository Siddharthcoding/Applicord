import { Router } from 'express';
import { emailController } from '../controllers/emailController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public OAuth callback redirect from Google
router.get('/google/callback', emailController.handleGoogleCallback);

// Protected routes below
router.use(authenticate);

router.get('/integrations', emailController.getIntegrations);
router.post('/integrations', emailController.connectIntegration);
router.post('/integrations/sync-all', emailController.syncAllIntegrations);
router.post('/integrations/:id/sync', emailController.syncIntegration);
router.delete('/integrations/:id', emailController.deleteIntegration);
router.get('/google/auth-url', emailController.getGoogleAuthUrl);

router.get('/suggestions', emailController.listSuggestions);
router.post('/suggestions/:id/resolve', emailController.resolveSuggestion);

export default router;
