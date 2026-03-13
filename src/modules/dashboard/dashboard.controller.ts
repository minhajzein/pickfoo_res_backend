import { Request, Response, NextFunction } from 'express';
import Restaurant from '../restaurant/restaurant.model.js';
import Order from '../order/order.model.js';
import Review from '../review/review.model.js';

const RUNNING_STATUSES = ['confirmed', 'preparing', 'ready', 'out-for-delivery'] as const;
const PAID_STATUS = 'paid';

function getDateRange(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  const now = end.getTime();

  switch (period) {
    case 'weekly':
      start.setTime(now - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      start.setTime(now - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'daily':
    default:
      start.setHours(0, 0, 0, 0);
      break;
  }
  return { start, end };
}

// @desc    Get dashboard stats for owner's restaurant
// @route   GET /api/v1/dashboard?period=daily|weekly|monthly
// @access  Private/Owner
export const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = (req.query.period as string) || 'daily';
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ success: false, message: 'Invalid period. Use daily, weekly, or monthly.' });
    }

    const restaurant = await Restaurant.findOne({ owner: req.user!._id });
    if (!restaurant) {
      return res.status(200).json({
        success: true,
        data: {
          runningOrders: 0,
          orderRequests: 0,
          revenue: { total: 0, period, points: [] },
          reviews: { averageRating: 0, total: 0 },
          popularItems: [],
        },
      });
    }

    const restaurantId = restaurant._id;
    const { start, end } = getDateRange(period);

    const [runningOrders, orderRequests, revenueResult, reviewsResult, popularItems] = await Promise.all([
      Order.countDocuments({
        restaurant: restaurantId,
        status: { $in: RUNNING_STATUSES },
      }),
      Order.countDocuments({
        restaurant: restaurantId,
        status: 'pending',
      }),
      Order.aggregate([
        {
          $match: {
            restaurant: restaurantId,
            paymentStatus: PAID_STATUS,
            orderDate: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' },
            orders: { $push: { orderDate: '$orderDate', totalAmount: '$totalAmount' } },
          },
        },
      ]),
      Review.aggregate([
        { $match: { restaurant: restaurantId } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            total: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            restaurant: restaurantId,
            paymentStatus: PAID_STATUS,
          },
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.menuItem',
            name: { $first: '$items.name' },
            orderCount: { $sum: '$items.quantity' },
          },
        },
        { $sort: { orderCount: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'menuitems',
            localField: '_id',
            foreignField: '_id',
            as: 'menuItemDoc',
          },
        },
        {
          $project: {
            id: '$_id',
            name: 1,
            orderCount: 1,
            imageUrl: { $arrayElemAt: ['$menuItemDoc.image', 0] },
          },
        },
      ]),
    ]);

    const totalRevenue = revenueResult[0]?.total ?? 0;
    const ordersForPoints = revenueResult[0]?.orders ?? [];

    const points: { label: string; value: number }[] = [];
    if (period === 'daily' && ordersForPoints.length > 0) {
      const byHour: Record<number, number> = {};
      for (let h = 0; h < 24; h++) byHour[h] = 0;
      for (const o of ordersForPoints) {
        const h = new Date(o.orderDate).getHours();
        byHour[h] = (byHour[h] || 0) + (o.totalAmount || 0);
      }
      const labels = ['12AM', '1AM', '2AM', '3AM', '4AM', '5AM', '6AM', '7AM', '8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM', '9PM', '10PM', '11PM'];
      for (let h = 0; h < 24; h++) {
        if (byHour[h] > 0) points.push({ label: labels[h], value: byHour[h] });
      }
      if (points.length === 0) points.push({ label: 'Today', value: totalRevenue });
    } else if ((period === 'weekly' || period === 'monthly') && ordersForPoints.length > 0) {
      const byDay: Record<string, number> = {};
      for (const o of ordersForPoints) {
        const d = new Date(o.orderDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        byDay[key] = (byDay[key] || 0) + (o.totalAmount || 0);
      }
      const sorted = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]));
      for (const [label, value] of sorted) {
        points.push({ label, value });
      }
    }
    if (points.length === 0 && totalRevenue > 0) {
      points.push({ label: period === 'daily' ? 'Today' : period === 'weekly' ? 'Last 7 days' : 'Last 30 days', value: totalRevenue });
    }

    const reviews = reviewsResult[0];
    const averageRating = reviews?.averageRating ?? 0;
    const reviewTotal = reviews?.total ?? 0;

    const popular = (popularItems || []).map((p: any) => ({
      id: p._id?.toString() ?? p.id?.toString() ?? '',
      name: p.name ?? 'Unknown',
      imageUrl: p.imageUrl ?? undefined,
      orderCount: p.orderCount ?? 0,
    }));

    res.status(200).json({
      success: true,
      data: {
        runningOrders,
        orderRequests,
        revenue: {
          total: totalRevenue,
          period,
          points,
        },
        reviews: {
          averageRating: Math.round(averageRating * 10) / 10,
          total: reviewTotal,
        },
        popularItems: popular,
      },
    });
  } catch (error) {
    next(error);
  }
};
