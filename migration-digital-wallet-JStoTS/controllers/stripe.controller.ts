import { Request, Response } from 'express';
import StripeService from '../services/stripe.service';
import validator from '../utils/validator';
import logger from '../utils/logger';

export const createPaymentMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, card }: { type: string; card: any } = req.body;

    if (type !== 'card' || !card) {
      res.status(400).json({ error: 'Invalid payment method details' });
      return;
    }

    const paymentMethod = await StripeService.createPaymentMethod(card);
    const customerId: string = req.user.stripeCustomerId;

    // Attach payment method to customer
    await StripeService.attachPaymentMethodToCustomer(paymentMethod.id, customerId);

    res.json({ paymentMethod });
  } catch (error) {
    logger.error('Error creating payment method:', error as any);
    res.status(500).json({ error: (error as any).message });
  }
};

export const getPaymentMethods = async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId: string = req.user.stripeCustomerId;
    const paymentMethods = await StripeService.listPaymentMethods(customerId);
    res.json({ paymentMethods });
  } catch (error) {
    logger.error('Error getting payment methods:', error as any);
    res.status(500).json({ error: (error as any).message });
  }
};

export const createPaymentIntent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error } = validator.validateAmount(req.body.amount);
    if (error) {
      res.status(400).json({ error: error.details[0].message });
      return;
    }

    const { amount }: { amount: number } = req.body;
    const customerId: string = req.user.stripeCustomerId;

    const paymentIntent = await StripeService.createPaymentIntent(amount, 'usd', customerId);
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    logger.error('Error creating payment intent:', error as any);
    res.status(500).json({ error: (error as any).message });
  }
};
