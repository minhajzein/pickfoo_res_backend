import { Router } from 'express';
import { getMyReviews } from './review.controller.js';
import { protect, authorize } from '../../middlewares/auth.middleware.js';

const router: Router = Router();

router.use(protect);
router.use(authorize('owner'));

router.get('/my-reviews', getMyReviews);

export default router;
