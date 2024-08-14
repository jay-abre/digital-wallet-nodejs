import express from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import kycRoutes from './kycRoutes';
// import walletRoutes from './wallet.routes';
// import stripeRoutes from './stripe.routes';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/kyc', kycRoutes);
// router.use('/wallet', walletRoutes);
// router.use('/stripe', stripeRoutes);

export default router;