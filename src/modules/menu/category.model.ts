import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  image: string;
  owner: mongoose.Types.ObjectId;
  parent: mongoose.Types.ObjectId | null;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, 'Please provide category name'],
      trim: true,
    },
    image: {
      type: String,
      default: '',
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICategory>('Category', categorySchema);
