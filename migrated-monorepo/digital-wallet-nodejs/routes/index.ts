import * as express from 'express';
import authRoutes from './auth.routes.js';
import walletRoutes from './wallet.routes.js';
import stripeRoutes from './stripe.routes.js';
import kycRoutes from './kyc.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/wallet', walletRoutes);
router.use('/stripe', stripeRoutes);
router.use('/kyc', kycRoutes);

export default router;