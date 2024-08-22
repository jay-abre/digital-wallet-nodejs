import * as mongoose from 'mongoose'; // Use a named import for mongoose
import { Document, Schema, model } from 'mongoose';

// Define the TypeScript interface for the Wallet document
interface IWallet extends Document {
  user: mongoose.Types.ObjectId;
  balance: number;
  currency: string;
  stripeCustomerId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define the allowed currency codes
const allowedCurrencies = ['USD', 'EUR', 'GBP', 'JPY'];

// Create the Mongoose schema for Wallet
const walletSchema = new Schema<IWallet>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    enum: allowedCurrencies
  },
  stripeCustomerId: {
    type: String,
    required: true
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

// Add indexes for optimization
walletSchema.index({ user: 1 });
walletSchema.index({ stripeCustomerId: 1 }, { unique: true });

// Create the Wallet model
const Wallet = model<IWallet>('Wallet', walletSchema);

export default Wallet;
