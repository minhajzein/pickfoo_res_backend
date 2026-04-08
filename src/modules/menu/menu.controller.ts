import { Request, Response, NextFunction } from 'express';
import MenuItem from './menuItem.model.js';
import Restaurant from '../restaurant/restaurant.model.js';
import {
  getReviewStatsByMenuItemForOwner,
  statsToReviewFields,
} from '../review/reviewMenuItemStats.js';
import { getPresignedUrl, deleteFileFromS3 } from '../../utils/s3.js';

/**
 * Helper to presign menu item image
 */
const presignMenuItem = async (menuItem: any) => {
  const m = menuItem.toObject ? menuItem.toObject() : menuItem;
  if (m.image) m.image = await getPresignedUrl(m.image);
  return m;
};

/**
 * Ensure base price is always the lowest variant price when variants are present.
 */
const applyVariantBasePrice = (body: any) => {
  if (Array.isArray(body?.variants) && body.variants.length > 0) {
    const numericPrices = body.variants
      .map((v: any) => Number(v?.price))
      .filter((p: number) => !Number.isNaN(p));
    if (numericPrices.length > 0) {
      body.price = Math.min(...numericPrices);
    }
  }
  return body;
};

// @desc    Create menu item (Global pool for owner)
// @route   POST /api/v1/menu
// @access  Private/Owner
export const createMenuItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body.owner = req.user!._id;
    applyVariantBasePrice(req.body);

    // Enforce restaurant linking at creation time.
    // Accept any of: restaurantId, restaurantIds[], restaurants[].
    const singleRestaurantId =
      typeof req.body?.restaurantId === 'string' && req.body.restaurantId.trim()
        ? req.body.restaurantId.trim()
        : null;
    const listFromRestaurantIds = Array.isArray(req.body?.restaurantIds) ? req.body.restaurantIds : [];
    const listFromRestaurants = Array.isArray(req.body?.restaurants) ? req.body.restaurants : [];

    const normalizedRestaurantIds = [
      ...(singleRestaurantId ? [singleRestaurantId] : []),
      ...listFromRestaurantIds,
      ...listFromRestaurants,
    ]
      .map((id: unknown) => String(id).trim())
      .filter((id: string) => id.length > 0);

    const uniqueRestaurantIds = [...new Set(normalizedRestaurantIds)];
    if (uniqueRestaurantIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one restaurant id',
      });
    }

    const ownedRestaurants = await Restaurant.find({
      _id: { $in: uniqueRestaurantIds },
      owner: req.user!._id,
    }).select('_id');

    if (ownedRestaurants.length !== uniqueRestaurantIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more restaurants are invalid or not owned by you',
      });
    }

    req.body.restaurants = uniqueRestaurantIds;
    delete req.body.restaurantId;
    delete req.body.restaurantIds;

    const menuItem = await MenuItem.create(req.body);
    const data = await presignMenuItem(menuItem);

    res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all menu items for owner
// @route   GET /api/v1/menu
// @access  Private/Owner
export const getMyMenuItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawMenuItems = await MenuItem.find({ owner: req.user!._id }).populate('restaurants', 'name');

    const statsMap = await getReviewStatsByMenuItemForOwner(req.user!._id);
    const menuItems = await Promise.all(
      rawMenuItems.map(async (item) => {
        const m = await presignMenuItem(item);
        const id = String(m._id);
        const { reviewAverage, reviewCount } = statsToReviewFields(statsMap.get(id));
        return { ...m, reviewAverage, reviewCount };
      })
    );

    res.status(200).json({
      success: true,
      count: menuItems.length,
      data: menuItems,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add item to multiple restaurants
// @route   PUT /api/v1/menu/:id/assign-restaurants
// @access  Private/Owner
export const assignItemToRestaurants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    if (menuItem.owner.toString() !== req.user!._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const { restaurantIds } = req.body;

    const restaurants = await Restaurant.find({
      _id: { $in: restaurantIds },
      owner: req.user!._id,
    });

    if (restaurants.length !== restaurantIds.length) {
      return res.status(400).json({ success: false, message: 'One or more restaurants are invalid or not owned by you' });
    }

    menuItem.restaurants = restaurantIds;
    await menuItem.save();

    const data = await presignMenuItem(menuItem);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get menu items for a specific restaurant
// @route   GET /api/v1/menu/restaurant/:restaurantId
// @access  Public
export const getRestaurantMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawMenuItems = await MenuItem.find({
      restaurants: req.params.restaurantId,
      isActive: true,
    });

    const menuItems = await Promise.all(
      rawMenuItems.map(item => presignMenuItem(item))
    );

    res.status(200).json({
      success: true,
      count: menuItems.length,
      data: menuItems,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update menu item
// @route   PUT /api/v1/menu/:id
// @access  Private/Owner
export const updateMenuItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    if (menuItem.owner.toString() !== req.user!._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    applyVariantBasePrice(req.body);

    // If restaurant linkage is provided during update, validate ownership and keep it non-empty.
    const hasRestaurantFields =
      Object.prototype.hasOwnProperty.call(req.body, 'restaurantId') ||
      Object.prototype.hasOwnProperty.call(req.body, 'restaurantIds') ||
      Object.prototype.hasOwnProperty.call(req.body, 'restaurants');

    if (hasRestaurantFields) {
      const singleRestaurantId =
        typeof req.body?.restaurantId === 'string' && req.body.restaurantId.trim()
          ? req.body.restaurantId.trim()
          : null;
      const listFromRestaurantIds = Array.isArray(req.body?.restaurantIds) ? req.body.restaurantIds : [];
      const listFromRestaurants = Array.isArray(req.body?.restaurants) ? req.body.restaurants : [];

      const normalizedRestaurantIds = [
        ...(singleRestaurantId ? [singleRestaurantId] : []),
        ...listFromRestaurantIds,
        ...listFromRestaurants,
      ]
        .map((id: unknown) => String(id).trim())
        .filter((id: string) => id.length > 0);

      const uniqueRestaurantIds = [...new Set(normalizedRestaurantIds)];
      if (uniqueRestaurantIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please provide at least one restaurant id',
        });
      }

      const ownedRestaurants = await Restaurant.find({
        _id: { $in: uniqueRestaurantIds },
        owner: req.user!._id,
      }).select('_id');

      if (ownedRestaurants.length !== uniqueRestaurantIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more restaurants are invalid or not owned by you',
        });
      }

      req.body.restaurants = uniqueRestaurantIds;
      delete req.body.restaurantId;
      delete req.body.restaurantIds;
    } else {
      // App may send a plain menu update without restaurant fields.
      // If this menu item has no linked restaurants, auto-link to owner's restaurants.
      const existingRestaurantIds = Array.isArray(menuItem.restaurants)
        ? menuItem.restaurants.map((id: any) => String(id))
        : [];
      if (existingRestaurantIds.length === 0) {
        const ownerRestaurants = await Restaurant.find({ owner: req.user!._id }).select('_id');
        const ownerRestaurantIds = ownerRestaurants.map((r) => String(r._id));
        if (ownerRestaurantIds.length > 0) {
          req.body.restaurants = ownerRestaurantIds;
        }
      }
    }

    menuItem = await MenuItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    const data = await presignMenuItem(menuItem);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete menu item
// @route   DELETE /api/v1/menu/:id
// @access  Private/Owner
export const deleteMenuItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    if (menuItem.owner.toString() !== req.user!._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    if (menuItem.image) {
      await deleteFileFromS3(menuItem.image);
    }

    await menuItem.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
