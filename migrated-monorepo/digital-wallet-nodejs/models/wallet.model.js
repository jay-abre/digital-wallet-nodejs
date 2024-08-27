import { Schema, model } from 'mongoose';
const walletSchema = new Schema({
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
walletSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});
const Wallet = model('Wallet', walletSchema);
export default Wallet;
