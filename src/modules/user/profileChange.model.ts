import mongoose, { Schema, Document } from 'mongoose';

export interface IProfileChange extends Document {
  user: mongoose.Types.ObjectId;
  pendingName?: string;
  pendingEmail?: string;
  pendingPassword?: string;
  pendingProfilePicture?: string;
  otp: string;
  otpExpires: Date;
}

const profileChangeSchema = new Schema<IProfileChange>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    pendingName: {
      type: String,
      trim: true,
    },
    pendingEmail: {
      type: String,
      lowercase: true,
    },
    pendingPassword: {
      type: String,
    },
    pendingProfilePicture: {
      type: String,
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

// Auto-delete after expiry
profileChangeSchema.index({ otpExpires: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IProfileChange>('ProfileChange', profileChangeSchema);

