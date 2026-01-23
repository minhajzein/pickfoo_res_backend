import { Router } from 'express';
import {
  createRestaurant,
  getMyRestaurants,
  getRestaurant,
  updateRestaurant,
  submitForVerification,
  deleteRestaurant,
} from './restaurant.controller.js';
import { protect, authorize } from '../../middlewares/auth.middleware.js';

const router: Router = Router();

router
  .route('/')
  .post(protect, authorize('owner'), createRestaurant);

router.get('/my-restaurants', protect, authorize('owner'), getMyRestaurants);

router
  .route('/:id')
  .get(getRestaurant)
  .put(protect, authorize('owner'), updateRestaurant)
  .delete(protect, authorize('owner'), deleteRestaurant);

router.put('/:id/submit-verification', protect, authorize('owner'), submitForVerification);

export default router;
