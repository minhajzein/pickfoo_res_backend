import { Request, Response, NextFunction } from 'express';
import Restaurant from './restaurant.model.js';

// @desc    Create new restaurant
// @route   POST /api/v1/restaurants
// @access  Private/Owner
export const createRestaurant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body.owner = req.user!._id;
    
    // Initial status is inactive until legal papers are complete and submitted for review
    req.body.status = 'inactive';

    const restaurant = await Restaurant.create(req.body);

    res.status(201).json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all restaurants for current owner
// @route   GET /api/v1/restaurants/my-restaurants
// @access  Private/Owner
export const getMyRestaurants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const restaurants = await Restaurant.find({ owner: req.user!._id });

    res.status(200).json({
      success: true,
      count: restaurants.length,
      data: restaurants,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update restaurant details
// @route   PUT /api/v1/restaurants/:id
// @access  Private/Owner
export const updateRestaurant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    // Make sure user is owner
    if (restaurant.owner.toString() !== req.user!._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to update this restaurant' });
    }

    // If status is being updated to pending, it means owner is submitting for verification
    if (req.body.status && req.body.status === 'pending') {
      // Validate if required legal docs are present before allowing submission
      if (!restaurant.legalDocs.fssaiLicenseNumber) {
        return res.status(400).json({ success: false, message: 'FSSAI License Number is required for verification' });
      }
    }

    restaurant = await Restaurant.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit restaurant for verification
// @route   PUT /api/v1/restaurants/:id/submit-verification
// @access  Private/Owner
export const submitForVerification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    // Make sure user is owner
    if (restaurant.owner.toString() !== req.user!._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    // Check if legal docs are present
    if (!restaurant.legalDocs.fssaiLicenseNumber) {
        return res.status(400).json({ success: false, message: 'FSSAI License Number is required for verification' });
    }

    restaurant.status = 'pending';
    await restaurant.save();

    res.status(200).json({
      success: true,
      message: 'Restaurant submitted for verification',
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single restaurant
// @route   GET /api/v1/restaurants/:id
// @access  Public
export const getRestaurant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    res.status(200).json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete restaurant
// @route   DELETE /api/v1/restaurants/:id
// @access  Private/Owner
export const deleteRestaurant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    // Make sure user is owner
    if (restaurant.owner.toString() !== req.user!._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this restaurant' });
    }

    await restaurant.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
