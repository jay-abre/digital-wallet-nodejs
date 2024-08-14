import mongoose, { Schema, Document } from 'mongoose';

interface IKYC extends Document {
  userId: string;
  documentType: string;
  documentNumber: string;
  documentImage: string;
  status: 'pending' | 'approved' | 'rejected';
}

const kycSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  documentType: { type: String, required: true },
  documentNumber: { type: String, required: true },
  documentImage: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });

const KYC = mongoose.model<IKYC>('KYC', kycSchema);

export default KYC;