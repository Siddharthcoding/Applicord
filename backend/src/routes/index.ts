import { Router } from 'express';
import authRoutes from './authRoutes';
import applicationRoutes from './applicationRoutes';
import reminderRoutes from './reminderRoutes';
import contactRoutes from './contactRoutes';
import documentRoutes from './documentRoutes';
import emailRoutes from './emailRoutes';
import analyticsRoutes from './analyticsRoutes';
import extensionRoutes from './extensionRoutes';
import importExportRoutes from './importExportRoutes';
import auditRoutes from './auditRoutes';
import notificationRoutes from './notificationRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/applications', applicationRoutes);
router.use('/reminders', reminderRoutes);
router.use('/contacts', contactRoutes);
router.use('/documents', documentRoutes);
router.use('/email', emailRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/extension', extensionRoutes);
router.use('/data', importExportRoutes);
router.use('/audit', auditRoutes);
router.use('/notifications', notificationRoutes);

export default router;
