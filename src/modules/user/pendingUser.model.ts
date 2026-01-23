import mongoose, { Schema, Document } from 'mongoose';

export interface IPendingUser extends Document {
  name: string;
  email: string;
  password: string;
  profilePicture?: string;
  role: 'user' | 'admin' | 'owner';
  otp: string;
  otpExpires: Date;
}

const pendingUserSchema = new Schema<IPendingUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    profilePicture: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      default: 'owner',
    },
    otp: {
      type: String,
      required: true,
    },
    otpExpires: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-delete after 15 minutes if not verified
pendingUserSchema.index({ otpExpires: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IPendingUser>('PendingUser', pendingUserSchema);
