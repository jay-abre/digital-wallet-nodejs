import mongoose, { Document, Schema, Model, model } from 'mongoose';

// Define the interface for a document in KYCVerification
interface IDocument {
    type: string;
    url: string;
    uploadedAt: Date;

}

// Define the interface for the KYCVerification schema
export interface IKYCVerification extends Document {
    user: mongoose.Types.ObjectId; // Use ObjectId for consistency
    status: 'pending' | 'approved' | 'rejected';
    documents: IDocument[];
    approvedAt?: Date;
    rejectionReason?: string | null;
    createdAt: Date;
}

// Define the KYCVerification schema
const kycVerificationSchema: Schema<IKYCVerification> = new Schema<IKYCVerification>(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        documents: [
            {
                type: {
                    type: String,
                    required: true,
                },
                url: {
                    type: String,
                    required: true,
                },
                uploadedAt: {
                    type: Date,
                    default: () => new Date(), // Set default to current date
                },
            },
        ],
        approvedAt: {
            type: Date,
        },
    },
    { timestamps: true } // Automatically add `createdAt` and `updatedAt` fields
);

// Create and export the KYCVerification model
const KYCVerification: Model<IKYCVerification> = model<IKYCVerification>('KYCVerification', kycVerificationSchema);

export default KYCVerification;
