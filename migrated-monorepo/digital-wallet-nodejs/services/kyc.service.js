import User from '../models/user.model';
import KYCVerificationModel from '../models/kyc-verification.model';
import * as Minio from 'minio';
import config from '../config';
import * as fs from 'fs';
import * as path from 'path';
import NotificationService from './notification.service';
import logger from '../utils/logger';
import { Types } from 'mongoose';
const minioClient = new Minio.Client({
    endPoint: config.minioEndpoint,
    useSSL: config.minioUseSSL === true,
    accessKey: config.minioAccessKey,
    secretKey: config.minioSecretKey,
});
const MINIO_BUCKET_NAME = config.minioBucket;
if (!MINIO_BUCKET_NAME) {
    throw new Error('MINIO_BUCKET_NAME is not set in the configuration');
}
const AUTO_APPROVE_KYC = process.env.AUTO_APPROVE_KYC === 'true';
class KYCService {
    static async initiateKYC(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        const userIdObject = new Types.ObjectId(user._id);
        let kycVerification = await KYCVerificationModel.findOne({ user: user._id });
        if (kycVerification) {
            throw new Error('KYC verification already initiated');
        }
        kycVerification = new KYCVerificationModel({
            user: userIdObject,
            status: AUTO_APPROVE_KYC ? 'approved' : 'pending',
        });
        if (AUTO_APPROVE_KYC) {
            kycVerification.approvedAt = new Date();
        }
        await kycVerification.save();
        await NotificationService.notifyKYCUpdate(userId, kycVerification.status);
        logger.info(`KYC initiated for user ${userId}. Auto-approve: ${AUTO_APPROVE_KYC}`);
        return kycVerification;
    }
    static async uploadDocument(userId, documentType, file) {
        const user = await User.findById(userId);
        let kycVerification = await KYCVerificationModel.findOne({ user: user?._id });
        if (!kycVerification) {
            kycVerification = await this.initiateKYC(userId);
        }
        if (AUTO_APPROVE_KYC) {
            logger.info(`Document upload skipped for user ${userId} due to auto-approval`);
            return kycVerification;
        }
        if (kycVerification.status !== 'pending') {
            throw new Error('KYC verification is not in pending state');
        }
        const fileName = `${userId}_${documentType}_${Date.now()}${path.extname(file.originalname)}`;
        try {
            let fileStream;
            let fileSize;
            if (file.buffer) {
                fileStream = Buffer.from(file.buffer);
                fileSize = file.buffer.length;
            }
            else if (file.path) {
                fileStream = fs.createReadStream(file.path);
                const stats = fs.statSync(file.path);
                fileSize = stats.size;
            }
            else {
                throw new Error('Invalid file object');
            }
            await minioClient.putObject(MINIO_BUCKET_NAME, fileName, fileStream, fileSize);
            const fileUrl = await minioClient.presignedGetObject(MINIO_BUCKET_NAME, fileName, 24 * 60 * 60);
            kycVerification.documents.push({
                type: documentType,
                url: fileUrl,
                uploadedAt: new Date(),
            });
            await kycVerification.save();
            if (fileStream instanceof fs.ReadStream) {
                fileStream.close();
            }
            if (file.path) {
                fs.unlinkSync(file.path);
            }
            logger.info(`Document uploaded successfully for user ${userId}`);
            return kycVerification;
        }
        catch (error) {
            logger.error('Error uploading document to MinIO:', error);
            if (error instanceof Error) {
                throw new Error('Failed to upload document: ' + error.message);
            }
            else {
                throw new Error('Failed to upload document');
            }
        }
    }
    static async updateKYCStatus(userId, newStatus, rejectionReason = null) {
        const user = await User.findById(userId);
        if (AUTO_APPROVE_KYC) {
            logger.info(`KYC status update skipped for user ${userId} due to auto-approval`);
            return { status: 'approved' };
        }
        let kycVerification = await KYCVerificationModel.findOne({ user: user?._id });
        if (!kycVerification) {
            throw new Error('KYC verification not found');
        }
        kycVerification.status = newStatus;
        if (newStatus === 'approved') {
            kycVerification.approvedAt = new Date();
        }
        else if (newStatus === 'rejected') {
            //kycVerification.rejectionReason = rejectionReason;
        }
        await kycVerification.save();
        await NotificationService.notifyKYCUpdate(userId, newStatus, rejectionReason);
        return kycVerification;
    }
    static async getKYCStatus(userId) {
        const user = await User.findById(userId);
        let kycVerification = await KYCVerificationModel.findOne({ user: user?._id });
        if (!kycVerification) {
            throw new Error('KYC verification not found');
        }
        return {
            status: kycVerification.status,
            documents: kycVerification.documents.map((doc) => ({
                type: doc.type,
                uploadedAt: doc.uploadedAt,
            })),
            initiatedAt: kycVerification.createdAt,
            approvedAt: kycVerification.approvedAt,
            //rejectionReason: kycVerification.rejectionReason,
            isAutoApproved: AUTO_APPROVE_KYC,
        };
    }
    static async isKYCApproved(userId) {
        if (AUTO_APPROVE_KYC) {
            return true;
        }
        const user = await User.findById(userId);
        let kycVerification = await KYCVerificationModel.findOne({ user: user?._id });
        return kycVerification && kycVerification.status === 'approved';
    }
    static async resubmitKYC(userId) {
        if (AUTO_APPROVE_KYC) {
            logger.info(`KYC resubmission skipped for user ${userId} due to auto-approval`);
            return { status: 'approved' };
        }
        const user = await User.findById(userId);
        let kycVerification = await KYCVerificationModel.findOne({ user: user?._id });
        if (!kycVerification) {
            throw new Error('KYC verification not found');
        }
        if (kycVerification.status !== 'rejected') {
            throw new Error('KYC verification is not in rejected state');
        }
        kycVerification.status = 'pending';
        // kycVerification.rejectionReason = null;
        kycVerification.documents = [];
        await kycVerification.save();
        await NotificationService.notifyKYCUpdate(userId, 'pending');
        return kycVerification;
    }
}
export default KYCService;
