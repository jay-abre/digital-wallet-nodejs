import mongoose from 'mongoose';
import type { Document } from 'mongoose';

const { Schema, model } = mongoose;

interface Wallet extends Document {
  user: typeof Schema.Types.ObjectId;
  balance: number;
  currency: string;
  stripeCustomerId: string;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<Wallet>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  balance: {
    type: Number,
    default: 0,
    min: 0,
  },
  currency: {
    type: String,
    default: 'USD',
  },
  stripeCustomerId: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
walletSchema.pre<Wallet>('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const Wallet = model<Wallet>('Wallet', walletSchema);

export default Wallet;
