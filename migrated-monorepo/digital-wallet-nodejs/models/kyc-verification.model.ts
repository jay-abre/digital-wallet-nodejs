import mongoose from 'mongoose';
const { Schema, model } = mongoose;

interface DocumentDetails {
    type: string;
    url: string;
    uploadedAt: Date;
}

interface KYCVerification extends mongoose.Document {
    user: mongoose.Types.ObjectId;
    status: 'pending' | 'approved' | 'rejected';
    documents: DocumentDetails[];
    approvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    rejectionReason?: string;
}

const kycVerificationSchema = new Schema<KYCVerification>(
    {
        user: {
            type: Schema.Types.ObjectId,
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
                    required: true,
                },
            },
        ],
        approvedAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

const KYCVerification = model<KYCVerification>('KYCVerification', kycVerificationSchema);

export default KYCVerification;