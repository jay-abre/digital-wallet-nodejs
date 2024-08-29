import mongoose, { Document, Schema, Model, model } from 'mongoose';

// Define the interface for the PaymentMethod schema
interface ICard {
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
}

interface IPaymentMethod extends Document {
  user: mongoose.Types.ObjectId;
  stripePaymentMethodId: string;
  type: string;
  card?: ICard;
  isDefault: boolean;
  createdAt: Date;
}

// Define the PaymentMethod schema
const paymentMethodSchema: Schema<IPaymentMethod> = new Schema<IPaymentMethod>({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stripePaymentMethodId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true
  },
  card: {
    brand: { type: String },
    last4: { type: String },
    expMonth: { type: Number },
    expYear: { type: Number }
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: () => new Date() // Use a function to return a Date object
  }
});

// Create and export the PaymentMethod model
const PaymentMethod: Model<IPaymentMethod> = model<IPaymentMethod>('PaymentMethod', paymentMethodSchema);

export default PaymentMethod;
