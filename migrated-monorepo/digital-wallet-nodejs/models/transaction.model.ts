import mongoose from 'mongoose';
const { Schema, model } = mongoose;

interface Transaction extends mongoose.Document {
  type: 'deposit' | 'withdraw' | 'transfer';
  amount: number;
  currency: string;
  fromWallet?: mongoose.Types.ObjectId;
  toWallet: mongoose.Types.ObjectId;
  status: 'pending' | 'completed' | 'failed';
  stripePaymentIntentId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<Transaction>({
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
    required: function (this: Transaction) {
      return this.type === 'transfer' && this.status !== 'pending';
    },
  },
  toWallet: {
    type: Schema.Types.ObjectId,
    ref: 'Wallet',
    required: function (this: Transaction) {
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
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

transactionSchema.pre('save', function (next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  next();
});

const Transaction = model<Transaction>('Transaction', transactionSchema);

export default Transaction;