import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  checkPassword(candidatePassword: string): Promise<boolean>;
}

const walletSchema: Schema = new mongoose.Schema({
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
  },
  password: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  wallet: walletSchema,
}, { timestamps: true });

userSchema.methods.checkPassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;