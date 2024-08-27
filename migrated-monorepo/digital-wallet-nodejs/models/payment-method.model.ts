import mongoose from 'mongoose';
const { Schema, model } = mongoose;

interface Card {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

interface PaymentMethod extends mongoose.Document {
  user: mongoose.Schema.Types.ObjectId;
  stripePaymentMethodId: string;
  type: string;
  card: Card;
  isDefault: boolean;
  createdAt: Date;
}

const paymentMethodSchema = new Schema<PaymentMethod>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  stripePaymentMethodId: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    required: true,
  },
  card: {
    brand: String,
    last4: String,
    expMonth: Number,
    expYear: Number,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const PaymentMethod = model<PaymentMethod>('PaymentMethod', paymentMethodSchema);

export default PaymentMethod;
