import mongoose, { Schema, Document } from 'mongoose';

export type NotificationTargetRole = 'owner' | 'customer' | 'admin';

export interface INotification extends Document {
  user: mongoose.Types.ObjectId | null;
  targetRole: NotificationTargetRole;
  type: string;
  title: string;
  message: string;
  restaurant?: mongoose.Types.ObjectId;
  order?: mongoose.Types.ObjectId;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  metadata?: Record<string, any>;
}

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    targetRole: {
      type: String,
      enum: ['owner', 'customer', 'admin'],
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

notificationSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<INotification>('Notification', notificationSchema);

