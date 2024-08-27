import express from 'express';
import WalletController from '../controller/walletController';

const router = express.Router();
const walletController = new WalletController();

router.post('/wallet', walletController.createWallet.bind(walletController));
router.get('/wallet/:userId', walletController.getWallet.bind(walletController));
router.post('/wallet/deposit', walletController.deposit.bind(walletController));
router.post('/wallet/payment-intent', walletController.createPaymentIntent.bind(walletController));
router.post('/wallet/confirm-payment', walletController.confirmPayment.bind(walletController));

export default router;
