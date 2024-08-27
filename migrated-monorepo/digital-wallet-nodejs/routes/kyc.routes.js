import * as express from 'express';
import KYCService from '../services/kyc.service';
import { authenticateJWT, authenticateAdmin } from '../middleware/auth.middleware';
import upload from '../middleware/file-upload.middleware';
const router = express.Router();
router.post('/initiate', authenticateJWT, async (req, res) => {
    const user = req.user;
    try {
        const kycVerification = await KYCService.initiateKYC(user.id);
        res.status(201).json(kycVerification);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.post('/upload-document', authenticateJWT, upload.single('document'), async (req, res) => {
    const user = req.user;
    try {
        // Your logic here
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// This route should be protected and only accessible by admin users
router.put('/update-status', authenticateAdmin, async (req, res) => {
    try {
        // Your logic here
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
export default router;
