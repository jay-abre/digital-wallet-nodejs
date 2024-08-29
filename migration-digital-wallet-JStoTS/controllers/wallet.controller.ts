import { Request, Response } from 'express';
import WalletService from '../services/wallet.service';
import logger from '../utils/logger';

export const createWallet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { initialBalance }: { initialBalance: number } = req.body;
    const userId: string = req.user.id;
    const email: string = req.user.email;

    // Call createWallet with an object argument
    const result = await WalletService.createWallet({
      userId,
      email,
      initialBalance
    });

    res.status(201).json(result);
  } catch (error: any) {
    logger.error('Error creating wallet:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deposit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, paymentMethodId }: { amount: number; paymentMethodId: string } = req.body;
    const userId: string = req.user.id;

    // Call deposit with an object argument
    const result = await WalletService.deposit({
      userId,
      amount,
      paymentMethodId
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};


  export const transfer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { amount, toUserId }: { amount: number; toUserId: string } = req.body;
      const fromUserId: string = req.user.id;

      // Call transfer with an object argument
      const result = await WalletService.transfer({
        fromUserId,
        toUserId,
        amount
      });

      res.json(result);
    } catch (error: any) {
      logger.error('Error transferring funds:', error);
      res.status(500).json({ error: error.message });
    }
  };


export const withdraw = async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount }: { amount: number } = req.body;
    const userId: string = req.user.id;

    const result = await WalletService.withdraw(userId, amount);
    res.json(result);
  } catch (error: any) {
    logger.error('Error withdrawing funds:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId: string = req.user.id;

    const result = await WalletService.getBalance(userId);
    res.json(result);
  } catch (error: any) {
    logger.error('Error getting balance:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getTransactionHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId: string = req.user.id;

    const result = await WalletService.getTransactions(userId); // Use getTransactions instead of getTransactionHistory
    res.json(result);
  } catch (error: any) {
    logger.error('Error getting transaction history:', error);
    res.status(500).json({ error: error.message });
  }
};

