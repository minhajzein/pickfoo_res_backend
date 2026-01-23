import { Router } from 'express';
import {
  createMenuItem,
  getMyMenuItems,
  getRestaurantMenu,
  updateMenuItem,
  assignItemToRestaurants,
  deleteMenuItem,
} from './menu.controller.js';
import {
  createCategory,
  getMyCategories,
  updateCategory,
  deleteCategory,
} from './category.controller.js';
import { protect, authorize } from '../../middlewares/auth.middleware.js';

const router: Router = Router();

router
  .route('/')
  .post(protect, authorize('owner'), createMenuItem)
  .get(protect, authorize('owner'), getMyMenuItems);

router.get('/restaurant/:restaurantId', getRestaurantMenu);

router
  .route('/:id')
  .put(protect, authorize('owner'), updateMenuItem)
  .delete(protect, authorize('owner'), deleteMenuItem);

router.put('/:id/assign-restaurants', protect, authorize('owner'), assignItemToRestaurants);

// Category Routes
router
  .route('/categories')
  .post(protect, authorize('owner'), createCategory)
  .get(protect, authorize('owner'), getMyCategories);

router
  .route('/categories/:id')
  .put(protect, authorize('owner'), updateCategory)
  .delete(protect, authorize('owner'), deleteCategory);

export default router;
