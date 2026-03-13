import { Request, Response, NextFunction } from 'express';
import Notification from './notification.model.js';

// @desc    Get notifications for current user
// @route   GET /api/v1/notifications
// @access  Private
export const getMyNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;
    const unreadOnly = req.query.unread === 'true';

    const query: any = { user: userId };
    if (unreadOnly) {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a notification as read
// @route   PATCH /api/v1/notifications/:id/read
// @access  Private
export const markNotificationRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      user: userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date();
      await notification.save();
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

