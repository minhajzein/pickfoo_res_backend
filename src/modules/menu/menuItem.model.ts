import mongoose, { Schema, Document } from 'mongoose';

export interface IMenuItem extends Document {
  owner: mongoose.Types.ObjectId;
  name: string;
  description: string;
  price: number;
  variants: {
    name: string;
    price: number;
  }[];
  image: string;
  category: string;
  isVeg: boolean;
  isActive: boolean;
  ingredients: string[];
  restaurants: mongoose.Types.ObjectId[]; // Linked to multiple restaurants
}

const menuItemSchema = new Schema<IMenuItem>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide item name'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide item description'],
    },
    price: {
      type: Number,
      required: [true, 'Please provide item price'],
      min: 0,
    },
    variants: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
      },
    ],
    image: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Please provide category'],
    },
    isVeg: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    ingredients: {
      type: [String],
      default: [],
    },
    restaurants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Restaurant',
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IMenuItem>('MenuItem', menuItemSchema);
