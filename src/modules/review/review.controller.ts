import { Request, Response, NextFunction } from 'express';
import Review from './review.model.js';

function orderContainsMenuItem(order: unknown, menuItemId: string): boolean {
  if (!order || typeof order !== 'object') return false;
  const items = (order as { items?: unknown }).items;
  if (!Array.isArray(items)) return false;
  return items.some((it: unknown) => {
    if (!it || typeof it !== 'object') return false;
    const raw = (it as { menuItem?: unknown }).menuItem;
    if (raw == null) return false;
    if (typeof raw === 'object' && raw !== null && '_id' in raw) {
      return String((raw as { _id: unknown })._id) === menuItemId;
    }
    return String(raw) === menuItemId;
  });
}

// @desc    Get all reviews for an owner's restaurants (optional ?menuItem= id to restrict to orders that included that dish)
// @route   GET /api/v1/reviews/my-reviews
// @access  Private/Owner
export const getMyReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const menuItemId =
      typeof req.query.menuItem === 'string' ? req.query.menuItem.trim() : '';

    let query = Review.find()
      .populate({
        path: 'restaurant',
        match: { owner: req.user!._id },
        select: 'name',
      })
      .populate('user', 'name profilePicture');

    if (menuItemId) {
      query = query.populate({
        path: 'order',
        select: 'items',
      });
    }

    const reviews = await query;

    let filteredReviews = reviews.filter((review) => review.restaurant !== null);

    if (menuItemId) {
      filteredReviews = filteredReviews.filter((review) =>
        orderContainsMenuItem(review.order, menuItemId)
      );
    }

    res.status(200).json({
      success: true,
      count: filteredReviews.length,
      data: filteredReviews,
    });
  } catch (error) {
    next(error);
  }
};
