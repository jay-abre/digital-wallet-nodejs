import express from 'express';
import multer from 'multer';
import { submitKYC, getKYCStatus, approveKYC, rejectKYC } from '../controllers/kycController';
import { verifyToken } from '../middleware/verifyTokenMiddleware';
import { verifyAdmin } from '../middleware/verifyAdminMiddleware';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/submit', verifyToken, upload.single('documentImage'), submitKYC);
router.get('/status', verifyToken, getKYCStatus);
router.post('/approve/:id', verifyToken, verifyAdmin, approveKYC);
router.post('/reject/:id', verifyToken, verifyAdmin, rejectKYC);

export default router;