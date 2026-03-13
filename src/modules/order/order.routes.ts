import { Router } from 'express';
import { getMyOrders, getOrderById, updateOrderStatus, updateOrderType } from './order.controller.js';
import { protect, authorize } from '../../middlewares/auth.middleware.js';

const router: Router = Router();

// Restaurant-owner order APIs:
// - list all orders for their restaurants
// - view a single order
// - update order status (confirmed, preparing, ready)
// - set order type: pickup (Pickfoo partner) or delivery (restaurant delivery boy)
router.use(protect);
router.use(authorize('owner'));

router.get('/my-orders', getMyOrders);
router.get('/:id', getOrderById);
router.put('/:id/status', updateOrderStatus);
router.put('/:id/order-type', updateOrderType);

export default router;
