import express from 'express';
import StripeController from '../controllers/stripe.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
const router = express.Router();
router.post('/create-payment-method', authenticateJWT, (req, res) => StripeController.createPaymentMethod(req, res));
router.get('/payment-methods', authenticateJWT, (req, res) => StripeController.getPaymentMethods(req, res));
export default router;
