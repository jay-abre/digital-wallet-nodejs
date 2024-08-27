import express, { Request, Response } from 'express';
import StripeController from '../controllers/stripe.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';

interface CustomRequest extends Request {
    user: { id: string; stripeCustomerId: string };
}

const router = express.Router();

router.post(
    '/create-payment-method',
    authenticateJWT,
    (req: Request, res: Response) => StripeController.createPaymentMethod(req as CustomRequest, res)
);

router.get(
    '/payment-methods',
    authenticateJWT,
    (req: Request, res: Response) => StripeController.getPaymentMethods(req as CustomRequest, res)
);

export default router;