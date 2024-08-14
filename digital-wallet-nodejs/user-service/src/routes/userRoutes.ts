import express from 'express';
import { assignRole } from '../controllers/userController';
import { checkRole } from '../middleware/authMiddleware';
import { verifyToken } from '../middleware/verifyTokenMiddleware';

const router = express.Router();

router.post('/assign-role', verifyToken, checkRole(['assignRoles']), assignRole);

export default router;