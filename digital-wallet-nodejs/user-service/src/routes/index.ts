import express from 'express';
import authRoutes from './authRoutes';
// import walletRoutes from './wallet.routes';
// import stripeRoutes from './stripe.routes';

const router = express.Router();

router.use('/auth', authRoutes);
// router.use('/wallet', walletRoutes);
// router.use('/stripe', stripeRoutes);

export default router;
