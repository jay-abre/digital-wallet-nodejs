import { Request, Response } from 'express';
import WalletService from '../service/walletService';
import { Types } from 'mongoose';
import logger from '../../../shared/logger';

// Interfaces for request payloads
interface CreateWalletRequest extends Request {
  body: {
    userId: string;
    email: string;
  };
}

interface DepositRequest extends Request {
  body: {
    userId: string;
    amount: number;
  };
}

interface CreatePaymentIntentRequest extends Request {
  body: {
    userId: string;
    amount: number;
  };
}

interface ConfirmPaymentRequest extends Request {
  body: {
    userId: string;
    paymentIntentId: string;
    paymentMethodId: string;
  };
}

class WalletController {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  async createWallet(req: CreateWalletRequest, res: Response) {
    try {
      const { userId, email } = req.body;
      logger.info(`Received request to create wallet for user ${userId}`);
      // Validation should be done here
      const wallet = await this.walletService.createWallet(new Types.ObjectId(userId), email);
      res.status(201).json(wallet);
    } catch (error) {
      logger.error(`Error creating wallet: ${error.message}`);
      res.status(400).json({ message: 'Unable to create wallet: ' + error.message });
    }
  }

  async getWallet(req: Request<{ userId: string }>, res: Response) {
    try {
      const { userId } = req.params;
      logger.info(`Received request to get wallet for user ${userId}`);
      const wallet = await this.walletService.getWallet(new Types.ObjectId(userId));
      res.status(200).json(wallet);
    } catch (error) {
      logger.error(`Error getting wallet: ${error.message}`);
      res.status(404).json({ message: 'Wallet not found: ' + error.message });
    }
  }

  async deposit(req: DepositRequest, res: Response) {
    try {
      const { userId, amount } = req.body;
      logger.info(`Received request to deposit ${amount} for user ${userId}`);
      // Validation should be done here
      const wallet = await this.walletService.deposit(new Types.ObjectId(userId), amount);
      res.status(200).json(wallet);
    } catch (error) {
      logger.error(`Error depositing funds: ${error.message}`);
      res.status(400).json({ message: 'Unable to deposit funds: ' + error.message });
    }
  }

  async createPaymentIntent(req: CreatePaymentIntentRequest, res: Response) {
    try {
      const { userId, amount } = req.body;
      logger.info(`Received request to create payment intent for user ${userId} with amount ${amount}`);
      // Validation should be done here
      const paymentIntent = await this.walletService.createPaymentIntent(new Types.ObjectId(userId), amount);
      res.status(201).json(paymentIntent);
    } catch (error) {
      logger.error(`Error creating payment intent: ${error.message}`);
      res.status(400).json({ message: 'Unable to create payment intent: ' + error.message });
    }
  }

  async confirmPayment(req: ConfirmPaymentRequest, res: Response) {
    try {
      const { userId, paymentIntentId, paymentMethodId } = req.body;
      logger.info(`Received request to confirm payment for user ${userId} with paymentIntentId ${paymentIntentId}`);
      // Validation should be done here
      const paymentIntent = await this.walletService.confirmPayment(new Types.ObjectId(userId), paymentIntentId, paymentMethodId);
      res.status(200).json(paymentIntent);
    } catch (error) {
      logger.error(`Error confirming payment: ${error.message}`);
      res.status(400).json({ message: 'Unable to confirm payment: ' + error.message });
    }
  }
}

export default WalletController;
