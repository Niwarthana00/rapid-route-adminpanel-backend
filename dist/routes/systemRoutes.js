import { Router } from 'express';
import { getAuditLogs, getNotifications, createNotification, getUsers, getHeaderNotifications, } from '../controllers/systemController.js';
const router = Router();
router.get('/audit-logs', getAuditLogs);
router.get('/notifications', getNotifications);
router.post('/notifications', createNotification);
router.get('/users', getUsers);
router.get('/header-notifications', getHeaderNotifications);
export default router;
