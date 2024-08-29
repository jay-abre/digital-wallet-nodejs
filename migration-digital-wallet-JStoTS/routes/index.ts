import express, { Router } from 'express';
import authRoutes from './auth.routes';
import walletRoutes from './wallet.routes';
import stripeRoutes from './stripe.routes';
import kycRoutes from './kyc.routes';

const router: Router = express.Router();

router.use('/auth', authRoutes);
router.use('/wallet', walletRoutes);
router.use('/stripe', stripeRoutes);
router.use('/kyc', kycRoutes);

export default router;
