import { Document, Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';

// Define the interface for the Wallet schema
interface IWallet {
    balance: number;
    stripeCustomerId: string;
}

// Define the interface for the User document
interface IUser extends Document {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'user' | 'admin';
    stripeCustomerId?: string;
    wallet: IWallet;
    isEmailVerified: boolean;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
    createdAt: Date;

    checkPassword(candidatePassword: string): Promise<boolean>;
}

// Define the Wallet schema
const walletSchema = new Schema<IWallet>(
    {
        balance: {
            type: Number,
            default: 0,
            min: 0,
        },
        stripeCustomerId: {
            type: String,
            required: true,
        },
    },
    { _id: false }
);

// Define the User schema
const userSchema = new Schema<IUser>(
    {
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
    }
);

// Hash password before saving
userSchema.pre<IUser>('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Method to check password
userSchema.methods.checkPassword = async function (candidatePassword: string): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = model<IUser>('User', userSchema);

export default User;
