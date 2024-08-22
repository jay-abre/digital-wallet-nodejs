import { Router } from 'express';
import WalletController from '../controller/WalletController';
import { authenticate, checkRole } from '../../user-service/src/middleware/authMiddleware';
const router = Router();
const walletController = new WalletController();

// Apply authentication middleware to all routes
router.use(authenticate);

// Apply role-based access control as needed
router.post('/wallet', checkRole(['admin']), walletController.createWallet.bind(walletController));
router.get('/wallet/:userId', checkRole(['admin', 'user']), walletController.getWallet.bind(walletController));
router.post('/wallet/deposit', checkRole(['user']), walletController.deposit.bind(walletController));
router.post('/wallet/payment-intent', checkRole(['user']), walletController.createPaymentIntent.bind(walletController));
router.post('/wallet/confirm-payment', checkRole(['user']), walletController.confirmPayment.bind(walletController));

export default router;
