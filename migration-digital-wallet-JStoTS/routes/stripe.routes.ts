import express, { Router } from 'express';
import * as StripeController from '../controllers/stripe.controller';

import { authenticateJWT } from '../middleware/auth.middleware';

const router: Router = express.Router();

router.post('/create-payment-method', authenticateJWT, StripeController.createPaymentMethod);
router.get('/payment-methods', authenticateJWT, StripeController.getPaymentMethods);

export default router;
