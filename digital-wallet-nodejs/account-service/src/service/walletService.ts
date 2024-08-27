import Stripe from 'stripe';
import Wallet from '../model/wallet';
import KYC from '../../../user-service/src/models/kycModels';
import { Types } from 'mongoose';
import logger from '../../../shared/logger';
import retry from 'async-retry';
class WalletService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2020-08-27',
    });
  }

  private async checkKYCStatus(userId: Types.ObjectId): Promise<boolean> {
    try {
      const kyc = await retry(
        async () => {
          return await KYC.findOne({ userId }).exec();
        },
        {
          retries: 3,
          minTimeout: 1000,
          maxTimeout: 5000,
          onRetry: (error, attempt) => {
            logger.warn(`Retrying KYC lookup for user ${userId} (attempt ${attempt}): ${error.message}`);
          },
        }
      );

      if (!kyc) {
        logger.warn(`No KYC record found for user ${userId}`);
        return false;
      }

      return kyc.status === 'approved';
    } catch (error) {
      logger.error(`Error checking KYC status for user ${userId}: ${error.message}`);
      throw new Error(`Error checking KYC status: ${error.message}`);
    }
  }


  async createWallet(userId: Types.ObjectId, email: string) {
    try {
      const isKYCCompleted = await this.checkKYCStatus(userId);
      if (!isKYCCompleted) {
        throw new Error('KYC not completed');
      }

      const existingWallet = await Wallet.findOne({ user: userId }).exec();
      if (existingWallet) {
        throw new Error('User already has a wallet');
      }

      const stripeCustomer = await this.stripe.customers.create({ email });
      if (!stripeCustomer || !stripeCustomer.id) {
        throw new Error('Failed to create Stripe customer');
      }

      const wallet = new Wallet({
        user: userId,
        stripeCustomerId: stripeCustomer.id,
        balance: 0,
        currency: 'usd',
      });

      await wallet.save();
      logger.info(`Wallet created for user ${userId}`);
      return wallet;
    } catch (error) {
      logger.error(`Error creating wallet for user ${userId}: ${error.message}`, { error });
      throw error;
    }
  }

  async getWallet(userId: Types.ObjectId) {
    try {
      const wallet = await Wallet.findOne({ user: userId }).exec();
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      logger.info(`Wallet retrieved for user ${userId}`);
      return wallet;
    } catch (error) {
      logger.error(`Error retrieving wallet for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  async deposit(userId: Types.ObjectId, amount: number) {
    try {
      const wallet = await this.getWallet(userId);
      wallet.balance = (wallet.balance || 0) + amount; // Ensure balance is defined
      await wallet.save();
      logger.info(`Deposited ${amount} to wallet for user ${userId}`);
      return wallet;
    } catch (error) {
      logger.error(`Error depositing ${amount} to wallet for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  async createPaymentIntent(userId: Types.ObjectId, amount: number) {
    try {
      const wallet = await this.getWallet(userId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amount * 100, // Amount in cents
        currency: wallet.currency,
        customer: wallet.stripeCustomerId,
      });
      logger.info(`Payment intent created for user ${userId} with amount ${amount}`);
      return paymentIntent;
    } catch (error) {
      logger.error(`Error creating payment intent for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  async confirmPayment(userId: Types.ObjectId, paymentIntentId: string, paymentMethodId: string) {
    try {
      const wallet = await this.getWallet(userId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
      if (!paymentMethod || paymentMethod.customer !== wallet.stripeCustomerId) {
        throw new Error('Payment method not found or does not belong to this user');
      }

      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });

      if (paymentIntent.status === 'succeeded') {
        const amount = paymentIntent.amount / 100; // Convert cents to dollars
        wallet.balance = (wallet.balance || 0) + amount; // Ensure balance is defined
        await wallet.save();
        logger.info(`Payment confirmed for user ${userId} with amount ${amount}`);
      }

      return paymentIntent;
    } catch (error) {
      logger.error(`Error confirming payment for user ${userId}: ${error.message}`);
      throw error;
    }
  }
}

export default WalletService;
