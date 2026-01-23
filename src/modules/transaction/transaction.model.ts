import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  order: mongoose.Types.ObjectId;
  restaurant: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId; // For owner dashboard tracking
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  paymentGateway: string; // e.g., Razorpay, Stripe
  gatewayTransactionId: string;
  type: 'credit' | 'debit' | 'payout';
}

const transactionSchema = new Schema<ITransaction>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentGateway: {
      type: String,
      default: 'Razorpay',
    },
    gatewayTransactionId: {
      type: String,
    },
    type: {
      type: String,
      enum: ['credit', 'debit', 'payout'],
      default: 'credit',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITransaction>('Transaction', transactionSchema);
