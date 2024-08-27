import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';
const walletSchema = new Schema({
    balance: {
        type: Number,
        default: 0,
        min: 0,
    },
    stripeCustomerId: {
        type: String,
        required: true,
    },
}, { _id: false });
const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    stripeCustomerId: {
        type: String,
        unique: true,
        sparse: true,
    },
    wallet: walletSchema,
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    createdAt: {
        type: Date,
        default: Date.now,
    },
});
// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});
// Method to check password
userSchema.methods.checkPassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};
const User = model('User', userSchema);
export default User;
