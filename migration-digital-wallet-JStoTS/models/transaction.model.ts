import mongoose, { Document, Schema, Model, model } from 'mongoose';

// Define the interface for the Transaction schema
export interface ITransaction extends Document {
  type: 'deposit' | 'withdraw' | 'transfer';
  amount: number;
  currency: string;
  fromWallet?: mongoose.Types.ObjectId;
  toWallet?: mongoose.Types.ObjectId;
  status: 'pending' | 'completed' | 'failed';
  stripePaymentIntentId?: string;
  metadata?: any; // Use 'any' for Mixed type; adjust if more specific type is known
  createdAt: Date;
  updatedAt: Date;
}

// Define the Transaction schema
const transactionSchema: Schema<ITransaction> = new Schema<ITransaction>({
  type: {
    type: String,
    enum: ['deposit', 'withdraw', 'transfer'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'USD',
  },
  fromWallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: function (this: ITransaction) {
  return this.type === 'transfer' && this.status !== 'pending';
},
},
toWallet: {
  type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: function (this: ITransaction) {
    return this.type === 'transfer' || this.type === 'deposit';
  },
},
status: {
  type: String,
  enum: ['pending', 'completed', 'failed'],
default: 'pending',
},
stripePaymentIntentId: {
  type: String,
},
metadata: {
  type: mongoose.Schema.Types.Mixed,
},
createdAt: {
  type: Date,
default: () => new Date(), // Use a function to return a Date object
},
});

// Create and export the Transaction model
const Transaction: Model<ITransaction> = model<ITransaction>('Transaction', transactionSchema);

export default Transaction;
