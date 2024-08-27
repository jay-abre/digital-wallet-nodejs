import { Request, Response } from 'express';
import WalletService from '../services/wallet.service.js';
import logger from '../utils/logger.js';

interface CustomRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

class WalletController {
  async createWallet(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { initialBalance } = req.body;
      const userId = req.user.id;
      const email = req.user.email;
      const result = await WalletService.createWallet(userId, email, initialBalance);
      return res.status(201).json(result);
    } catch (error) {
      logger.error('Error creating wallet:', error);
      if (error instanceof Error) {
        return res.status(500).json({ error: error.message });
      } else {
        return res.status(500).json({ error: 'Unknown error' });
      }
    }
  }

  async deposit(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { amount, paymentMethodId } = req.body;
      const userId = req.user.id;
      const result = await WalletService.deposit(userId, amount, paymentMethodId);
      return res.json(result);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      } else {
        return res.status(400).json({ error: 'Unknown error' });
      }
    }
  }

  async transfer(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { amount, toUserId } = req.body;
      const fromUserId = req.user.id;
      const result = await WalletService.transfer(fromUserId, toUserId, amount);
      return res.json(result);
    } catch (error) {
      logger.error('Error transferring funds:', error);
      if (error instanceof Error) {
        return res.status(500).json({ error: error.message });
      } else {
        return res.status(500).json({ error: 'Unknown error' });
      }
    }
  }

  async withdraw(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { amount } = req.body;
      const userId = req.user.id;
      const result = await WalletService.withdraw(userId, amount);
      return res.json(result);
    } catch (error) {
      logger.error('Error withdrawing funds:', error);
      if (error instanceof Error) {
        return res.status(500).json({ error: error.message });
      } else {
        return res.status(500).json({ error: 'Unknown error' });
      }
    }
  }

  async getBalance(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const result = await WalletService.getBalance(userId);
      return res.json(result);
    } catch (error) {
      logger.error('Error getting balance:', error);
      if (error instanceof Error) {
        return res.status(500).json({ error: error.message });
      } else {
        return res.status(500).json({ error: 'Unknown error' });
      }
    }
  }

  async getTransactionHistory(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const result = await WalletService.getTransactions(userId);
      return res.json(result);
    } catch (error) {
      logger.error('Error getting transaction history:', error);
      if (error instanceof Error) {
        return res.status(500).json({ error: error.message });
      } else {
        return res.status(500).json({ error: 'Unknown error' });
      }
    }
  }
}

export default new WalletController();