import mongoose, { Document, Schema, Model, model } from 'mongoose';

// Define the interface for the Wallet schema
export interface IWallet extends Document {
  user: mongoose.Types.ObjectId;
  balance: number;
  currency: string;
  stripeCustomerId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define the Wallet schema
const walletSchema: Schema<IWallet> = new Schema<IWallet>({
  user: {
    type: mongoose.Schema.Types.ObjectId,
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
    default: 'USD'
  },
  stripeCustomerId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: () => new Date() // Use a function to return a Date object
  },
  updatedAt: {
    type: Date,
    default: () => new Date() // Use a function to return a Date object
  }
});

// Update the updatedAt field before saving
walletSchema.pre<IWallet>('save', function (next) {
  this.updatedAt = new Date(); // Assign a Date object
  next();
});

// Create and export the Wallet model
const Wallet: Model<IWallet> = model<IWallet>('Wallet', walletSchema);

export default Wallet;
