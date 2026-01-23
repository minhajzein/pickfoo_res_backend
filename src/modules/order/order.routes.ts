import { Router } from 'express';
import { getMyOrders, updateOrderStatus } from './order.controller.js';
import { protect, authorize } from '../../middlewares/auth.middleware.js';

const router: Router = Router();

router.use(protect);
router.use(authorize('owner'));

router.get('/my-orders', getMyOrders);
router.put('/:id/status', updateOrderStatus);

export default router;
