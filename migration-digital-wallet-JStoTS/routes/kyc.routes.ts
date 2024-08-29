import express, { Request, Response, Router } from 'express';
import KYCService from '../services/kyc.service';
import { authenticateJWT, authenticateAdmin } from '../middleware/auth.middleware';
import upload from '../middleware/file-upload.middleware';

const router: Router = express.Router();

// Define a type for KYC status
type KYCStatus = "pending" | "approved" | "rejected";

interface UploadDocumentRequest extends Request {
  body: {
    documentType: string;
  };
  file?: Express.Multer.File;
}

interface UpdateStatusRequest extends Request {
  body: {
    userId: string;
    newStatus: KYCStatus; // Use the defined type here
  };
}

router.post(
    '/upload-document',
    authenticateJWT,
    upload.single('document'),
    async (req: UploadDocumentRequest, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        const { documentType } = req.body;
        const kycVerification = await KYCService.uploadDocument(
            req.user.id,
            documentType,
            req.file
        );
        res.json(kycVerification);
      } catch (error) {
        res.status(400).json({ error: (error as Error).message });
      }
    }
);

router.get('/status', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const status = await KYCService.getKYCStatus(req.user.id);
    res.json(status);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.put('/update-status', authenticateAdmin, async (req: UpdateStatusRequest, res: Response) => {
  try {
    const { userId, newStatus } = req.body;
    const kycVerification = await KYCService.updateKYCStatus(userId, newStatus);
    res.json(kycVerification);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
