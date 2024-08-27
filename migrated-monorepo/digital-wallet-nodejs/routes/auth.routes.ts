import * as express from 'express';
import * as AuthController from '../controllers/auth.controller.js';
import { authenticateAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/verify-email/:token', AuthController.verifyEmail);

// Admin routes
router.post('/create-admin', authenticateAdmin, AuthController.createAdmin);
router.put('/make-admin/:userId', authenticateAdmin, AuthController.makeAdmin);
router.put('/remove-admin/:userId', authenticateAdmin, AuthController.removeAdmin);
router.post('/setup-admin', AuthController.setupAdmin);

export default router;