import { Router } from 'express';
import { getDashboard } from './dashboard.controller.js';
import { protect, authorize } from '../../middlewares/auth.middleware.js';

const router: Router = Router();

router.get('/', protect, authorize('owner'), getDashboard);

export default router;
