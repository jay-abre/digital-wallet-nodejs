import { Request, Response } from 'express';
import StripeService from '../services/stripe.service.js';
import validator from '../utils/validator.js';
import logger from '../utils/logger.js';

interface CustomRequest extends Request {
  user: {
    stripeCustomerId: string;
  };
}

const initStripeService = (req: Request): StripeService => {
  return new StripeService();
};

class StripeController {
  static async createPaymentMethod(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { type, card } = req.body;

      if (type !== 'card' || !card) {
        return res.status(400).json({ error: 'Invalid payment method details' });
      }

      const stripeService = initStripeService(req);
      const paymentMethod = await stripeService.createPaymentMethod(type, card);
      const customerId = req.user.stripeCustomerId;
      await StripeService.attachPaymentMethodToCustomer(paymentMethod.id, customerId);

      return res.json({ paymentMethod });
    } catch (error) {
      logger.error('Error creating payment method:', error as any);
      return res.status(500).json({ error: (error as any).message });
    }
  }

  static async getPaymentMethods(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const customerId = req.user.stripeCustomerId;
      const paymentMethods = await StripeService.listPaymentMethods(customerId);
      return res.json({ paymentMethods });
    } catch (error) {
      logger.error('Error getting payment methods:', error as any);
      return res.status(500).json({ error: (error as any).message });
    }
  }

  static async createPaymentIntent(req: CustomRequest, res: Response): Promise<Response> {
    try {

      const validationResult = validator.validateAmount(req.body.amount);
      if (validationResult.error) return res.status(400).json({ error: validationResult.error.details[0].message });

      const { amount, paymentMethodId } = req.body;
      const customerId = req.user.stripeCustomerId;

      const paymentIntent = await StripeService.createPaymentIntent(amount, 'usd', customerId, paymentMethodId);
      return res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      logger.error('Error creating payment intent:', error as any);
      return res.status(500).json({ error: (error as any).message });
    }
  }
}

export default StripeController;