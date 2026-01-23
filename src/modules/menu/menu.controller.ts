import { Request, Response, NextFunction } from 'express';
import MenuItem from './menuItem.model.js';
import Restaurant from '../restaurant/restaurant.model.js';

// @desc    Create menu item (Global pool for owner)
// @route   POST /api/v1/menu
// @access  Private/Owner
export const createMenuItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body.owner = req.user!._id;

    const menuItem = await MenuItem.create(req.body);

    res.status(201).json({
      success: true,
      data: menuItem,
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
    const menuItems = await MenuItem.find({ owner: req.user!._id }).populate('restaurants', 'name');

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

    const { restaurantIds } = req.body; // Expecting array of restaurant IDs

    // Verify all restaurants belong to this owner
    const restaurants = await Restaurant.find({
      _id: { $in: restaurantIds },
      owner: req.user!._id,
    });

    if (restaurants.length !== restaurantIds.length) {
      return res.status(400).json({ success: false, message: 'One or more restaurants are invalid or not owned by you' });
    }

    menuItem.restaurants = restaurantIds;
    await menuItem.save();

    res.status(200).json({
      success: true,
      data: menuItem,
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
    const menuItems = await MenuItem.find({
      restaurants: req.params.restaurantId,
      isActive: true,
    });

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

    menuItem = await MenuItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: menuItem,
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

    await menuItem.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
