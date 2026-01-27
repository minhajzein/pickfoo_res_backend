import mongoose, { Schema, Document } from 'mongoose';

export interface IRestaurant extends Document {
  owner: mongoose.Types.ObjectId;
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  contactNumber: string;
  email: string;
  image: string;
  
  // Legal & Verification (Specific to India/Kerala)
  legalDocs: {
    fssaiLicenseNumber: string;
    fssaiCertificateUrl?: string;
    gstNumber?: string;
    gstCertificateUrl?: string;
    tradeLicenseNumber?: string; // D&O License (Kerala)
    tradeLicenseUrl?: string;
    healthCertificateUrl?: string;
    panNumber?: string;
  };
  
  status: 'inactive' | 'pending' | 'active' | 'rejected' | 'suspended';
  verificationNotes?: string;
  
  // Metadata
  rating: number;
  numReviews: number;
  isOpen: boolean;
  isManualOverride: boolean;
  openingHours: {
    day: number; // 0 for Sunday, 1 for Monday, etc.
    openTime: string; // HH:mm
    closeTime: string; // HH:mm
    isClosed: boolean;
  }[];
}

const restaurantSchema = new Schema<IRestaurant>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide restaurant name'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide restaurant description'],
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true, default: 'Kerala' },
      zipCode: { type: String, required: true },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    contactNumber: {
      type: String,
      required: [true, 'Please provide contact number'],
    },
    email: {
      type: String,
      required: [true, 'Please provide business email'],
    },
    image: {
      type: String,
      default: '',
    },
    legalDocs: {
      fssaiLicenseNumber: {
        type: String,
        required: [true, 'FSSAI License Number is required'],
      },
      fssaiCertificateUrl: { type: String },
      gstNumber: { type: String },
      gstCertificateUrl: { type: String },
      tradeLicenseNumber: { type: String },
      tradeLicenseUrl: { type: String },
      healthCertificateUrl: { type: String },
      panNumber: { type: String },
    },
    status: {
      type: String,
      enum: ['inactive', 'pending', 'active', 'rejected', 'suspended'],
      default: 'inactive',
    },
    verificationNotes: {
      type: String,
    },
    rating: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    isOpen: {
      type: Boolean,
      default: false,
    },
    isManualOverride: {
      type: Boolean,
      default: false,
    },
    openingHours: [
      {
        day: { type: Number, required: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '22:00' },
        isClosed: { type: Boolean, default: false },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for geo-spatial queries if needed later
restaurantSchema.index({ 'address.coordinates': '2dsphere' });

export default mongoose.model<IRestaurant>('Restaurant', restaurantSchema);
