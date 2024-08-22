import { Types } from 'mongoose';
import Transaction from '../model/transaction';
import Wallet from '../../account-service/model/wallet';
import logger from '../../shared/logger';

interface CreateTransactionParams {
  type: 'deposit' | 'withdraw' | 'transfer';
  amount: number;
  currency?: string;
  fromWallet?: Types.ObjectId;
  toWallet: Types.ObjectId;
  status?: 'pending' | 'completed' | 'failed';
  stripePaymentIntentId?: string;
  metadata?: Record<string, unknown>;
}

interface FilterParams {
  type?: 'deposit' | 'withdraw' | 'transfer';
  amount?: number;
  currency?: string;
  fromWallet?: Types.ObjectId;
  toWallet?: Types.ObjectId;
  status?: 'pending' | 'completed' | 'failed';
  stripePaymentIntentId?: string;
  createdAt?: Date | { $gte: Date } | { $lte: Date };
}

class TransactionService {
  async createTransaction(params: CreateTransactionParams) {
    logger.info('Creating transaction', { params });

    try {
      const transaction = new Transaction({
        ...params,
        createdAt: new Date(),
      });

      const savedTransaction = await transaction.save();
      logger.info('Transaction created successfully', { transaction: savedTransaction });
      return savedTransaction;
    } catch (error) {
      logger.error('Error creating transaction', { error });
      throw error;
    }
  }

  async getTransactionById(id: Types.ObjectId) {
    logger.info('Retrieving transaction by ID', { id });

    try {
      const transaction = await Transaction.findById(id).exec();
      if (!transaction) {
        logger.warn('Transaction not found', { id });
      }
      return transaction;
    } catch (error) {
      logger.error('Error retrieving transaction by ID', { error });
      throw error;
    }
  }

  async getTransactions(filter: FilterParams = {}) {
    logger.info('Retrieving transactions with filter', { filter });

    try {
      const transactions = await Transaction.find(filter).exec();
      return transactions;
    } catch (error) {
      logger.error('Error retrieving transactions', { error });
      throw error;
    }
  }

  async updateTransactionStatus(id: Types.ObjectId, status: 'pending' | 'completed' | 'failed') {
    logger.info('Updating transaction status', { id, status });

    try {
      const updatedTransaction = await Transaction.findByIdAndUpdate(id, { status }, { new: true }).exec();
      if (!updatedTransaction) {
        logger.warn('Transaction not found for status update', { id });
      }
      return updatedTransaction;
    } catch (error) {
      logger.error('Error updating transaction status', { error });
      throw error;
    }
  }

  async processTransfer(fromWalletId: Types.ObjectId, toWalletId: Types.ObjectId, amount: number, stripePaymentIntentId?: string) {
    logger.info('Processing transfer', { fromWalletId, toWalletId, amount, stripePaymentIntentId });

    try {
      const fromWallet = await Wallet.findById(fromWalletId).exec();
      const toWallet = await Wallet.findById(toWalletId).exec();

      if (!fromWallet || !toWallet) {
        throw new Error('One or both wallets not found');
      }

      if (fromWallet.balance < amount) {
        throw new Error('Insufficient funds');
      }

      await this.createTransaction({
        type: 'transfer',
        amount: -amount,
        fromWallet: fromWalletId,
        toWallet: toWalletId,
        status: 'completed',
        stripePaymentIntentId,
      });

      await this.createTransaction({
        type: 'transfer',
        amount,
        fromWallet: fromWalletId,
        toWallet: toWalletId,
        status: 'completed',
        stripePaymentIntentId,
      });

      fromWallet.balance -= amount;
      toWallet.balance += amount;
      await fromWallet.save();
      await toWallet.save();

      logger.info('Transfer processed successfully', { fromWallet, toWallet });
      return { fromWallet, toWallet };
    } catch (error) {
      logger.error('Error processing transfer', { error });
      throw error;
    }
  }
}

export default new TransactionService();
