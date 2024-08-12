import mongoose, { CallbackError, Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

interface IWallet {
  balance: number;
  stripeCustomerId: string;
}

interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  wallet: IWallet;
  createdAt: Date;
  checkPassword(candidatePassword: string): Promise<boolean>;
}

const walletSchema: Schema<IWallet> = new mongoose.Schema({
  balance: {
    type: Number,
    default: 0,
    min: 0,
  },
  stripeCustomerId: {
    type: String,
    required: true,
  },
}, { _id: false }); // Disable _id for subdocument

const userSchema: Schema<IUser> = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/\S+@\S+\.\S+/, 'is invalid'], // Email format validation
    index: true, // Add index for faster queries
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
  wallet: walletSchema,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre<IUser>('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (err) {
    next(err as CallbackError);
  }
});

// Method to check password
userSchema.methods.checkPassword = async function(candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;