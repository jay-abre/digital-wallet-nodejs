import mongoose, { Schema, Document } from 'mongoose';

interface IKYC extends Document {
  userId: mongoose.Types.ObjectId;
  documentType: string;
  documentNumber: string;
  documentImage: string; // Consider changing this to a URL if using external storage
  status: 'pending' | 'approved' | 'rejected';
}

const kycSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  documentType: { type: String, required: true },
  documentNumber: { type: String, required: true },
  documentImage: { type: String, required: true }, // Change this if storing URLs
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });

// Ensure an index on userId for fast lookups
kycSchema.index({ userId: 1 });

const KYC = mongoose.model<IKYC>('KYC', kycSchema);

export default KYC;
