import { Schema, model } from 'mongoose';
const kycVerificationSchema = new Schema({
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
}, { timestamps: true });
const KYCVerification = model('KYCVerification', kycVerificationSchema);
export default KYCVerification;
