import User from "../models/user.model";
import * as Minio from 'minio';
import config from "../config";
import fs from "fs";
import path from "path";
import NotificationService from "./notification.service";
import logger from "../utils/logger";
import KYCVerification, { IKYCVerification } from "../models/kyc-verification.model";

let minioClient: Minio.Client;
let MINIO_BUCKET_NAME: string | undefined;

interface File {
  buffer?: Buffer;
  path?: string;
  originalname?: string;
}

function initializeMinioClient() {
  const endPoint = config.minioEndpoint;
  const accessKey = config.minioAccessKey;
  const secretKey = config.minioSecretKey;
  MINIO_BUCKET_NAME = config.minioBucket;

  if (!endPoint || !accessKey || !secretKey) {
    throw new Error("MinIO configuration is missing required properties.");
  }

  if (!MINIO_BUCKET_NAME) {
    logger.warn("MINIO_BUCKET_NAME is not set in the configuration. Some features may not work correctly.");
  }

  minioClient = new Minio.Client({
    endPoint,
    useSSL: config.minioUseSSL === "true",
    accessKey,
    secretKey,
  });
}

// Initialize the Minio client
initializeMinioClient();

const AUTO_APPROVE_KYC = process.env.AUTO_APPROVE_KYC === "true";

class KYCService {
  static async initiateKYC(userId: string): Promise<IKYCVerification> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    let kycVerification = await KYCVerification.findOne({ user: userId });
    if (kycVerification) {
      throw new Error("KYC verification already initiated");
    }

    kycVerification = new KYCVerification({
      user: userId,
      status: AUTO_APPROVE_KYC ? "approved" : "pending",
    });

    if (AUTO_APPROVE_KYC) {
      kycVerification.approvedAt = new Date();
    }

    await kycVerification.save();

    const notificationService = new NotificationService();
    await notificationService.notifyKYCUpdate(userId, kycVerification.status);

    logger.info(`KYC initiated for user ${userId}. Auto-approve: ${AUTO_APPROVE_KYC}`);

    return kycVerification;
  }
  static async uploadDocument(
      userId: string,
      documentType: string,
      file: File
  ): Promise<IKYCVerification> {
    let kycVerification = await KYCVerification.findOne({ user: userId });
    if (!kycVerification) {
      kycVerification = await this.initiateKYC(userId);
    }

    if (AUTO_APPROVE_KYC) {
      logger.info(`Document upload skipped for user ${userId} due to auto-approval`);
      return kycVerification;
    }

    if (kycVerification.status !== "pending") {
      throw new Error("KYC verification is not in pending state");
    }

    const fileName = `${userId}_${documentType}_${Date.now()}${path.extname(file.originalname || "")}`;

    let fileUrl: string | undefined;
    let fileStream: fs.ReadStream | Buffer;
    let fileSize: number;

    try {
      if (file.buffer) {
        fileStream = Buffer.from(file.buffer);
        fileSize = file.buffer.length;
      } else if (file.path) {
        fileStream = fs.createReadStream(file.path);
        const stats = fs.statSync(file.path);
        fileSize = stats.size;
      } else {
        throw new Error("Invalid file object");
      }

      if (MINIO_BUCKET_NAME) {
        await minioClient.putObject(
            MINIO_BUCKET_NAME,
            fileName,
            fileStream,
            fileSize
        );

        // Generate the presigned URL after uploading the file
        fileUrl = await minioClient.presignedGetObject(
            MINIO_BUCKET_NAME,
            fileName,
            24 * 60 * 60 // 24 hours
        );
      } else {
        throw new Error("MINIO_BUCKET_NAME is not defined");
      }

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
    } catch (error) {
      if (error instanceof Error) {
        logger.error("Error uploading document to MinIO:", error.message);
        throw new Error("Failed to upload document: " + error.message);
      } else {
        logger.error("Unexpected error uploading document to MinIO:", error);
        throw new Error("Failed to upload document due to an unexpected error");
      }
    }
  }
  static async updateKYCStatus(
      userId: string,
      newStatus: "pending" | "approved" | "rejected",
      rejectionReason: string | null = null
  ): Promise<IKYCVerification> {
    if (AUTO_APPROVE_KYC) {
      logger.info(`KYC status update skipped for user ${userId} due to auto-approval`);
      // Ensure you return a proper IKYCVerification object
      return { status: "approved" } as IKYCVerification;
    }

    const kycVerification = await KYCVerification.findOne({ user: userId });
    if (!kycVerification) {
      throw new Error("KYC verification not found");
    }

    kycVerification.status = newStatus;
    if (newStatus === "approved") {
      kycVerification.approvedAt = new Date(); // Use new Date() for Date type
    } else if (newStatus === "rejected") {
      kycVerification.rejectionReason = rejectionReason; // Ensure this field exists in IKYCVerification
    }

    await kycVerification.save();
    const notificationService = new NotificationService();
    await notificationService.notifyKYCUpdate(userId, newStatus, rejectionReason);

    return kycVerification;
  }

  static async getKYCStatus(userId: string): Promise<{
    status: string;
    documents: { type: string; uploadedAt?: number }[];
    initiatedAt: number;
    approvedAt?: number;
    rejectionReason?: string | null;
    isAutoApproved: boolean;
  }> {
    const kycVerification = await KYCVerification.findOne({ user: userId });
    if (!kycVerification) {
      throw new Error("KYC verification not found");
    }

    return {
      status: kycVerification.status,
      documents: kycVerification.documents.map((doc) => ({
        type: doc.type,
        uploadedAt: doc.uploadedAt ? doc.uploadedAt.getTime() : undefined, // Convert Date to number (timestamp)
      })),
      initiatedAt: kycVerification.createdAt.getTime(),// Convert Date to number (timestamp)
      approvedAt: kycVerification.approvedAt ? kycVerification.approvedAt.getTime() : undefined, // Convert Date to number (timestamp)
      rejectionReason: kycVerification.rejectionReason,
      isAutoApproved: AUTO_APPROVE_KYC,
    };
  }


  static async isKYCApproved(userId: string): Promise<boolean> {
    const kycVerification = await KYCVerification.findOne({ user: userId });

    // Return false if kycVerification is null or its status is not 'approved'
    return kycVerification ? kycVerification.status === "approved" : false;
  }

  static async resubmitKYC(userId: string): Promise<IKYCVerification> {
    if (AUTO_APPROVE_KYC) {
      logger.info(`KYC resubmission skipped for user ${userId} due to auto-approval`);
      return { status: "approved" } as unknown as IKYCVerification;
    }

    const kycVerification = await KYCVerification.findOne({ user: userId });
    if (!kycVerification) {
      throw new Error("KYC verification not found");
    }

    if (kycVerification.status !== "rejected") {
      throw new Error("KYC verification is not in rejected state");
    }

    kycVerification.status = "pending";
    kycVerification.rejectionReason = null;
    kycVerification.documents = [];

    await kycVerification.save();

    const notificationService = new NotificationService();
    await notificationService.notifyKYCUpdate(userId, "pending");

    return kycVerification;
  }
}

export default KYCService;
