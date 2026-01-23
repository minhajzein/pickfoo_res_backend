import { Router } from 'express';
import { getMyTransactions, getTransactionStats } from './transaction.controller.js';
import { protect, authorize } from '../../middlewares/auth.middleware.js';

const router: Router = Router();

router.use(protect);
router.use(authorize('owner'));

router.get('/', getMyTransactions);
router.get('/stats', getTransactionStats);

export default router;
