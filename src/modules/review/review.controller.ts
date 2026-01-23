import { Request, Response, NextFunction } from 'express';
import Review from './review.model.js';

// @desc    Get all reviews for an owner's restaurants
// @route   GET /api/v1/reviews/my-reviews
// @access  Private/Owner
export const getMyReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviews = await Review.find()
      .populate({
        path: 'restaurant',
        match: { owner: req.user!._id },
        select: 'name'
      })
      .populate('user', 'name profilePicture');

    const filteredReviews = reviews.filter(review => review.restaurant !== null);

    res.status(200).json({
      success: true,
      count: filteredReviews.length,
      data: filteredReviews,
    });
  } catch (error) {
    next(error);
  }
};
