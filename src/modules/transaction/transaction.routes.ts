import { Router } from 'express';
import { getMyTransactions, getTransactionStats, getWalletSummary } from './transaction.controller.js';
import { protect, authorize } from '../../middlewares/auth.middleware.js';

const router: Router = Router();

router.use(protect);
router.use(authorize('owner'));

// Transaction history (credit/debit)
router.get('/', getMyTransactions);

// Aggregated stats for dashboard
router.get('/stats', getTransactionStats);

// Wallet summary for withdrawals (balance, credit, debit)
router.get('/wallet-summary', getWalletSummary);

export default router;
