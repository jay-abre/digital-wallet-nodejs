import { Schema, model } from 'mongoose';
const transactionSchema = new Schema({
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
        required: function () {
            return this.type === 'transfer' && this.status !== 'pending';
        },
    },
    toWallet: {
        type: Schema.Types.ObjectId,
        ref: 'Wallet',
        required: function () {
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
const Transaction = model('Transaction', transactionSchema);
export default Transaction;
