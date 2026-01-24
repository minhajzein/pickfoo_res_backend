import { Request, Response, NextFunction } from 'express';
import Restaurant from './restaurant.model.js';
import { getPresignedUrl, deleteFileFromS3 } from '../../utils/s3.js';

/**
 * Helper to presign all restaurant URLs
 */
const presignRestaurant = async (restaurant: any) => {
  const r = restaurant.toObject ? restaurant.toObject() : restaurant;
  
  if (r.image) r.image = await getPresignedUrl(r.image);
  
  if (r.legalDocs) {
    if (r.legalDocs.fssaiCertificateUrl) r.legalDocs.fssaiCertificateUrl = await getPresignedUrl(r.legalDocs.fssaiCertificateUrl);
    if (r.legalDocs.gstCertificateUrl) r.legalDocs.gstCertificateUrl = await getPresignedUrl(r.legalDocs.gstCertificateUrl);
    if (r.legalDocs.tradeLicenseUrl) r.legalDocs.tradeLicenseUrl = await getPresignedUrl(r.legalDocs.tradeLicenseUrl);
    if (r.legalDocs.healthCertificateUrl) r.legalDocs.healthCertificateUrl = await getPresignedUrl(r.legalDocs.healthCertificateUrl);
  }
  
  return r;
};

// @desc    Create new restaurant
// @route   POST /api/v1/restaurants
// @access  Private/Owner
export const createRestaurant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body.owner = req.user!._id;
    
    // Initial status is inactive until legal papers are complete and submitted for review
    req.body.status = 'inactive';

    const restaurant = await Restaurant.create(req.body);

    const data = await presignRestaurant(restaurant);

    res.status(201).json({
      success: true,
      data,
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
    const rawRestaurants = await Restaurant.find({ owner: req.user!._id });
    
    const restaurants = await Promise.all(
      rawRestaurants.map(restaurant => presignRestaurant(restaurant))
    );

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

    if (restaurant.owner.toString() !== req.user!._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to update this restaurant' });
    }

    if (req.body.status && req.body.status === 'pending') {
      if (!restaurant.legalDocs.fssaiLicenseNumber) {
        return res.status(400).json({ success: false, message: 'FSSAI License Number is required for verification' });
      }
    }

    restaurant = await Restaurant.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    const data = await presignRestaurant(restaurant!);

    res.status(200).json({
      success: true,
      data,
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

    if (restaurant.owner.toString() !== req.user!._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    if (!restaurant.legalDocs.fssaiLicenseNumber) {
        return res.status(400).json({ success: false, message: 'FSSAI License Number is required for verification' });
    }

    restaurant.status = 'pending';
    await restaurant.save();

    const data = await presignRestaurant(restaurant);

    res.status(200).json({
      success: true,
      message: 'Restaurant submitted for verification',
      data,
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

    const data = await presignRestaurant(restaurant);

    res.status(200).json({
      success: true,
      data,
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

    if (restaurant.owner.toString() !== req.user!._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this restaurant' });
    }

    const filesToDelete = [];
    if (restaurant.image) filesToDelete.push(restaurant.image);
    if (restaurant.legalDocs.fssaiCertificateUrl) filesToDelete.push(restaurant.legalDocs.fssaiCertificateUrl);
    if (restaurant.legalDocs.gstCertificateUrl) filesToDelete.push(restaurant.legalDocs.gstCertificateUrl);
    if (restaurant.legalDocs.tradeLicenseUrl) filesToDelete.push(restaurant.legalDocs.tradeLicenseUrl);
    if (restaurant.legalDocs.healthCertificateUrl) filesToDelete.push(restaurant.legalDocs.healthCertificateUrl);

    if (filesToDelete.length > 0) {
      await Promise.all(filesToDelete.map(url => deleteFileFromS3(url)));
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
