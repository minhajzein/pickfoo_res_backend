import { Request, Response, NextFunction } from 'express';
import Category from './category.model.js';

// @desc    Create category
// @route   POST /api/v1/menu/categories
// @access  Private/Owner
export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body.owner = req.user!._id;

    const category = await Category.create(req.body);

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all categories for owner
// @route   GET /api/v1/menu/categories
// @access  Private/Owner
export const getMyCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await Category.find({ owner: req.user!._id });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/v1/menu/categories/:id
// @access  Private/Owner
export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (category.owner.toString() !== req.user!._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category
// @route   DELETE /api/v1/menu/categories/:id
// @access  Private/Owner
export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (category.owner.toString() !== req.user!._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    await category.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
