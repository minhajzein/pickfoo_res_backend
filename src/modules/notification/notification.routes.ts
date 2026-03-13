import { Router } from 'express';
import { getMyNotifications, markNotificationRead } from './notification.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router: Router = Router();

router.use(protect);

router.get('/', getMyNotifications);
router.patch('/:id/read', markNotificationRead);

export default router;

