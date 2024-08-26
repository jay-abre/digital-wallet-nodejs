// controllers/paymentController.ts

import { Request, Response } from 'express';
import PaymentService from '../service/paymentService';

class PaymentController {
  // Create a payment intent
  async createPaymentIntent(req: Request, res: Response) {
    try {
      const { amount, currency, paymentMethodTypes, metadata } = req.body;

      if (!amount || !currency || !paymentMethodTypes) {
        return res.status(400).json({ message: 'Invalid input' });
      }

      const paymentIntent = await PaymentService.createPaymentIntent({
        amount,
        currency,
        paymentMethodTypes,
        metadata,
      });

      return res.status(201).json(paymentIntent);
    } catch (error) {
      console.error('Error in createPaymentIntent:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Retrieve a payment intent
  async getPaymentIntent(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: 'Invalid payment intent ID' });
      }

      const paymentIntent = await PaymentService.getPaymentIntent(id);

      return res.status(200).json(paymentIntent);
    } catch (error) {
      console.error('Error in getPaymentIntent:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Confirm a payment intent
  async confirmPaymentIntent(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: 'Invalid payment intent ID' });
      }

      const paymentIntent = await PaymentService.confirmPaymentIntent(id);

      return res.status(200).json(paymentIntent);
    } catch (error) {
      console.error('Error in confirmPaymentIntent:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Cancel a payment intent
  async cancelPaymentIntent(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: 'Invalid payment intent ID' });
      }

      const paymentIntent = await PaymentService.cancelPaymentIntent(id);

      return res.status(200).json(paymentIntent);
    } catch (error) {
      console.error('Error in cancelPaymentIntent:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}

export default new PaymentController();
