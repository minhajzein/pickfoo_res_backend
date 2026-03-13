import { Request, Response, NextFunction } from 'express';
import Order from './order.model.js';

// Allowed status transitions that a restaurant owner can perform
const OWNER_ALLOWED_STATUSES = ['confirmed', 'preparing', 'ready'] as const;

// @desc    Get all orders for the current restaurant owner
//          Returns all orders for restaurants owned by this user.
// @route   GET /api/v1/orders/my-orders
// @access  Private/Owner
export const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await Order.find()
      .populate({
        path: 'restaurant',
        match: { owner: req.user!._id },
        select: 'name',
      })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    // Filter out orders where restaurant didn't match owner
    const filteredOrders = orders.filter((order) => order.restaurant !== null);

    res.status(200).json({
      success: true,
      count: filteredOrders.length,
      data: filteredOrders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order (full details) for the current restaurant owner
// @route   GET /api/v1/orders/:id
// @access  Private/Owner
export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate({
        path: 'restaurant',
        match: { owner: req.user!._id },
        select: 'name',
      })
      .populate('user', 'name email');

    if (!order || !order.restaurant) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status (owner can move to confirmed, preparing, ready)
// @route   PUT /api/v1/orders/:id/status
// @access  Private/Owner
export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, orderType } = req.body as { status?: string; orderType?: string };

    if (!status || !OWNER_ALLOWED_STATUSES.includes(status as any)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Allowed statuses: confirmed, preparing, ready.',
      });
    }

    let order = await Order.findById(req.params.id).populate('restaurant');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check ownership
    const restaurant: any = order.restaurant;
    if (!restaurant || restaurant.owner.toString() !== req.user!._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    // Only allow forward progress in the flow: pending -> confirmed -> preparing -> ready
    const flowOrder = ['pending', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'delivered', 'cancelled'];
    const currentIndex = flowOrder.indexOf(order.status);
    const targetIndex = flowOrder.indexOf(status);

    if (currentIndex === -1 || targetIndex === -1 || targetIndex < currentIndex) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status transition for this order.',
      });
    }

    // If moving to PREPARING, owner can choose pickup or delivery inline.
    if (status === 'preparing' && orderType) {
      if (!['pickup', 'delivery'].includes(orderType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid orderType. Use \"pickup\" or \"delivery\".',
        });
      }
      order.orderType = orderType as 'pickup' | 'delivery';
    }

    order.status = status as any;
    await order.save();

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// Statuses before which owner can change order type (pickup vs delivery)
const ORDER_TYPE_EDITABLE_STATUSES = ['pending', 'confirmed'];

// @desc    Set order type: pickup (Pickfoo partner picks up) or delivery (restaurant delivery boy delivers)
// @route   PUT /api/v1/orders/:id/order-type
// @access  Private/Owner
export const updateOrderType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderType } = req.body as { orderType?: string };

    if (!orderType || !['pickup', 'delivery'].includes(orderType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid orderType. Use "pickup" or "delivery".',
      });
    }

    const order = await Order.findById(req.params.id).populate('restaurant');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const restaurant: any = order.restaurant;
    if (!restaurant || restaurant.owner.toString() !== req.user!._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    if (!ORDER_TYPE_EDITABLE_STATUSES.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order type can only be changed when order is pending or confirmed.',
      });
    }

    order.orderType = orderType as 'pickup' | 'delivery';
    await order.save();

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

