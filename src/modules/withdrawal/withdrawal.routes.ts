import { Router } from 'express';
import { getMyWithdrawals, createWithdrawal } from './withdrawal.controller.js';
import { protect, authorize } from '../../middlewares/auth.middleware.js';

const router: Router = Router();

router.use(protect);
router.use(authorize('owner'));

router.get('/', getMyWithdrawals);
router.post('/', createWithdrawal);

export default router;
