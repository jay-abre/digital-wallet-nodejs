import * as mongoose from 'mongoose';
import { Document, Schema } from 'mongoose';

// Define an interface for the Transaction document
interface ITransaction extends Document {
  type: 'deposit' | 'withdraw' | 'transfer';
  amount: number;
  currency?: string;
  fromWallet?: mongoose.Types.ObjectId;
  toWallet: mongoose.Types.ObjectId;
  status?: 'pending' | 'completed' | 'failed';
  stripePaymentIntentId?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

// Create the transaction schema
const transactionSchema = new Schema<ITransaction>({
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
    type: Schema.Types.ObjectId,
    ref: 'Wallet',
    required: function (this: ITransaction) {
      return this.type === 'transfer' && this.status !== 'pending';
    },
  },
  toWallet: {
    type: Schema.Types.ObjectId,
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
    type: Schema.Types.Mixed,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create the model
const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);

export default Transaction;
