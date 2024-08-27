import { Request, Response } from 'express';
import TransactionService from '../service/transactionService';
import { Types } from 'mongoose';
import logger from '../../shared/logger';

// Define the TransactionController class
class TransactionController {
  // Method to handle creating a transaction
  async createTransaction(req: Request, res: Response) {
    try {
      const { type, amount, fromWallet, toWallet, stripePaymentIntentId, metadata } = req.body;

      // Validate input
      if (!type || !amount || !toWallet) {
        logger.warn('Create transaction failed: Missing required fields', { body: req.body });
        return res.status(400).json({ message: 'Invalid input. Required fields: type, amount, toWallet' });
      }

      if (amount <= 0) {
        logger.warn('Create transaction failed: Amount must be greater than 0', { body: req.body });
        return res.status(400).json({ message: 'Invalid amount. Amount must be greater than 0' });
      }

      const transaction = await TransactionService.createTransaction({
        type,
        amount,
        fromWallet: fromWallet ? new Types.ObjectId(fromWallet) : undefined,
        toWallet: new Types.ObjectId(toWallet),
        stripePaymentIntentId,
        metadata,
      });

      logger.info('Transaction created successfully', { transaction });
      return res.status(201).json(transaction);
    } catch (error) {
      logger.error('Error in createTransaction:', { error });
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Method to handle getting a transaction by ID
  async getTransaction(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!Types.ObjectId.isValid(id)) {
        logger.warn('Get transaction failed: Invalid transaction ID', { id });
        return res.status(400).json({ message: 'Invalid transaction ID' });
      }

      const transaction = await TransactionService.getTransactionById(new Types.ObjectId(id));

      if (!transaction) {
        logger.info('Transaction not found', { id });
        return res.status(404).json({ message: 'Transaction not found' });
      }

      logger.info('Transaction retrieved successfully', { transaction });
      return res.status(200).json(transaction);
    } catch (error) {
      logger.error('Error in getTransaction:', { error });
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}

export default new TransactionController();
