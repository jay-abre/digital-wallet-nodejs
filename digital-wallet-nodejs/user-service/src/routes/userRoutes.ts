import express from 'express';
import { assignRole } from '../controllers/userController';
import { checkRole } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/assign-role', checkRole(['assignRoles']), assignRole);

export default router;