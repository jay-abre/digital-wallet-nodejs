import * as express from 'express';
import KYCService from '../services/kyc.service.js';
import { authenticateJWT, authenticateAdmin } from '../middleware/auth.middleware.js';
import upload from '../middleware/file-upload.middleware.js';
import { Request, Response } from 'express';
import { Multer } from 'multer';

interface AuthenticatedRequest extends Request {
  user: { id: string };
  file?: Express.Multer.File;
}

const router = express.Router();

router.post('/initiate', authenticateJWT, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  try {
    const kycVerification = await KYCService.initiateKYC(user.id);
    res.status(201).json(kycVerification);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post(
    '/upload-document',
    authenticateJWT,
    upload.single('document'),
    async (req: Request, res: Response) => {
      const user = (req as AuthenticatedRequest).user;
      try {
        // Your logic here
      } catch (error) {
        res.status(400).json({ error: (error as Error).message });
      }
    }
);

// This route should be protected and only accessible by admin users
router.put('/update-status', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    // Your logic here
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;