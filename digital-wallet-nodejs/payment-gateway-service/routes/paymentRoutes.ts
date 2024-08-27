// routes/paymentRoutes.ts

import { Router } from 'express';
import PaymentController from '../controller/paymentController';

const router = Router();

router.post('/payment-intents', PaymentController.createPaymentIntent);
router.get('/payment-intents/:id', PaymentController.getPaymentIntent);
router.post('/payment-intents/:id/confirm', PaymentController.confirmPaymentIntent);
router.post('/payment-intents/:id/cancel', PaymentController.cancelPaymentIntent);

export default router;
