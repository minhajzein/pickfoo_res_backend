import { Router } from 'express';
import {
  getMyBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
} from './bankAccount.controller.js';
import { protect, authorize } from '../../middlewares/auth.middleware.js';

const router: Router = Router();

router.use(protect);
router.use(authorize('owner'));

router.get('/', getMyBankAccounts);
router.post('/', createBankAccount);
router.put('/:id', updateBankAccount);
router.delete('/:id', deleteBankAccount);

export default router;
