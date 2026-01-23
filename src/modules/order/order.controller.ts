import { Request, Response, NextFunction } from 'express';
import Order from './order.model.js';

// @desc    Get all orders for a restaurant owner
// @route   GET /api/v1/orders/my-orders
// @access  Private/Owner
export const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Current user is the owner. Find orders for restaurants owned by this user
    // Actually, simpler to find orders based on the 'owner' if we had that, 
    // but the Order model links to 'restaurant'.
    // We need to populate and filter.
    
    const orders = await Order.find()
      .populate({
        path: 'restaurant',
        match: { owner: req.user!._id },
        select: 'name'
      })
      .populate('user', 'name email');

    // Filter out orders where restaurant didn't match owner
    const filteredOrders = orders.filter(order => order.restaurant !== null);

    res.status(200).json({
      success: true,
      count: filteredOrders.length,
      data: filteredOrders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PUT /api/v1/orders/:id/status
// @access  Private/Owner
export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    let order = await Order.findById(req.params.id).populate('restaurant');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check ownership
    const restaurant: any = order.restaurant;
    if (restaurant.owner.toString() !== req.user!._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    order.status = status;
    await order.save();

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};
