import mongoose from 'mongoose';
import Wallet from '../models/wallet.model.js';
import IWallet from '../models/wallet.model.js';
import PaymentMethod from '../models/payment-method.model.js';
import IPaymentMethod from '../models/payment-method.model.js';
import Transaction from '../models/transaction.model.js';
import ITransaction from '../models/transaction.model.js';
import KYCVerification from '../models/kyc-verification.model.js';
import StripeService from "./stripe.service.js";
import NotificationService from "./notification.service.js";
import logger from "../utils/logger.js";
import {randomBytes} from "node:crypto";
import qrcode from 'qrcode';
import kycVerificationModel from "../models/kyc-verification.model.js";

const { Types, Schema } = mongoose;
const STRIPE_TEST_PAYMENT_METHODS: Set<string> = new Set([
  'pm_card_visa', 'pm_card_mastercard', 'pm_card_amex', 'pm_card_discover',
  'pm_card_diners', 'pm_card_jcb', 'pm_card_unionpay', 'pm_card_visa_debit',
  'pm_card_mastercard_prepaid', 'pm_card_threeDSecure2Required', 'pm_usBankAccount',
  'pm_sepaDebit', 'pm_bacsDebit', 'pm_alipay', 'pm_wechat'
]);

interface CreateWalletResult {
  wallet: IWallet;
}

interface DepositResult {
  balance: number;
  transactionId: string;
}

interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
}

interface ConfirmPaymentIntentResult {
  balance: number;
  transactionId: string;
}

interface PaymentStatusResult {
  status: string;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface BalanceResult {
  balance: number;
}

interface AddPaymentMethodResult {
  message: string;
}

interface PaymentMethodInfo {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
  isDefault: boolean;
}

interface DeletePaymentMethodResult {
  message: string;
}

interface WithdrawResult {
  balance: number;
  payoutId: string;
}

interface TransferResult {
  fromBalance: number;
  toBalance: number;
}

interface QRCodeResult {

  qrCodeDataURL: string;
  paymentId: string;
}

interface InitiateQRPaymentResult {
  clientSecret: string;
  amount: number;
  paymentIntentId: string;
  status: string;
}

interface ConfirmQRPaymentResult {
  message: string;
  paymentIntentId: string;
}


class WalletService {
  static async createWallet(userId: string, email: string, initialBalance: number): Promise<CreateWalletResult> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const kycVerification: KYCVerification | null = await KYCVerification.findOne({
        user: userObjectId as any,
      });


      if (!kycVerification || kycVerification.status !== "approved") {
        throw new Error(
            "KYC verification is not approved. Cannot create wallet."
        );
      }

      const existingWallet: IWallet | null = await Wallet.findOne({ user: userObjectId as any });
      if (existingWallet) {
        throw new Error("User already has a wallet");
      }

      const stripeCustomer = await StripeService.createCustomer(email);

      const wallet = new Wallet({
        user: userId,
        balance: initialBalance,
        stripeCustomerId: stripeCustomer.id,
      });

      await wallet.save();

      if (initialBalance > 0) {
        const transaction = await this.createTransaction("deposit", initialBalance, null, wallet._id);
        await NotificationService.notifyDeposit(userId, initialBalance, transaction._id);
      }

      logger.info(`Wallet created for user ${userId} with initial balance ${initialBalance}`);

      return { wallet };
    } catch (error) {
      logger.error("Error in createWallet:", error);
      throw new Error(`Failed to create wallet: ${(error as Error).message}`);
    }
  }

  static async deposit(userId: string, amount: number, paymentMethodId: string): Promise<DepositResult> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const wallet: IWallet | null = await Wallet.findOne({ user: userObjectId as any });
      if (!wallet) {
        throw new Error("Wallet not found");
      }

      const paymentMethod: IPaymentMethod | null = await PaymentMethod.findOne({
        user: new Types.ObjectId(userId) as any,
        stripePaymentMethodId: paymentMethodId
      });


      if (!paymentMethod) {
        throw new Error("Payment method not found or does not belong to this user");
      }

      let paymentIntent: any;
      if (STRIPE_TEST_PAYMENT_METHODS.has(paymentMethodId)) {
        paymentIntent = {

          id: `pi_simulated_${randomBytes(16).toString("hex")}`,
          status: "succeeded",
          amount: amount * 100
        };
        logger.info(`Simulated payment intent for test payment method: ${JSON.stringify(paymentIntent)}`);
      } else {
        paymentIntent = await StripeService.createPaymentIntent(
            amount * 100,
            "usd",
            wallet.stripeCustomerId
        );

        paymentIntent = await StripeService.confirmPaymentIntent(
            paymentIntent.id,
            paymentMethodId
        );
      }

      if (paymentIntent.status === "succeeded") {
        const depositAmount = paymentIntent.amount / 100;
        wallet.balance += depositAmount;
        await wallet.save();

        const transaction = await this.createTransaction(
            "deposit",
            depositAmount,
            null,
            wallet._id,
            paymentIntent.id
        );

        await NotificationService.notifyDeposit(wallet.user.toString() , depositAmount, transaction._id);

        return {
          balance: wallet.balance,
          transactionId: paymentIntent.id,
        };
      } else {
        throw new Error("Deposit failed");
      }
    } catch (error) {
      logger.error("Error in deposit:", error);
      throw new Error(`Deposit failed: ${(error as Error).message}`);
    }
  }

  static async createPaymentIntent(userId: string, amount: number): Promise<PaymentIntentResult> {
    const userObjectId = new Types.ObjectId(userId);
    const wallet: IWallet | null = await Wallet.findOne({ user: userObjectId as any });
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const paymentIntent = await StripeService.createPaymentIntent(
        amount,
        "usd",
        wallet.stripeCustomerId
    );

    return {
      clientSecret: paymentIntent.client_secret ?? "",
      paymentIntentId: paymentIntent.id,
    };
  }

  static async confirmPaymentIntent(userId: string, paymentIntentId: string, paymentMethodId: string): Promise<ConfirmPaymentIntentResult> {
    const userObjectId = new Types.ObjectId(userId);
    const wallet: IWallet | null = await Wallet.findOne({ user: userObjectId as any });
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const paymentMethod: IPaymentMethod | null = await PaymentMethod.findOne({
      user: userId as any,
      stripePaymentMethodId: paymentMethodId
    });

    if (!paymentMethod) {
      throw new Error("Payment method not found or does not belong to this user");
    }

    let paymentIntent: any;
    if (STRIPE_TEST_PAYMENT_METHODS.has(paymentMethodId)) {
      paymentIntent = {
        id: paymentIntentId,
        status: "succeeded",
        amount: 5000
      };
      logger.info(`Simulated payment intent confirmation for test payment method: ${JSON.stringify(paymentIntent)}`);
    } else {
      paymentIntent = await StripeService.confirmPaymentIntent(
          paymentIntentId,
          paymentMethodId
      );
    }

    if (paymentIntent.status === "succeeded") {
      const amount = paymentIntent.amount / 100;
      wallet.balance += amount;
      await wallet.save();

      const transaction = await this.createTransaction(
          "deposit",
          amount,
          null,
          wallet._id,
          paymentIntent.id
      );

      await NotificationService.notifyDeposit(userId, amount, transaction._id);

      return { balance: wallet.balance, transactionId: paymentIntent.id };
    } else {
      throw new Error("Payment failed");
    }
  }

  static async getPaymentStatus(userId: string, paymentIntentId: string): Promise<PaymentStatusResult> {
    const transaction: ITransaction | null = await Transaction.findOne({user: new Types.ObjectId(userId)})
        .populate('fromWallet');

    if (!transaction || !transaction.fromWallet) {
      throw new Error("Payment not found or does not belong to this user");
    }
    return {
      status: transaction.status,
      amount: transaction.amount,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    };
  }


  static async getBalance(userId: string): Promise<BalanceResult> {
    const userObjectId = new Types.ObjectId(userId);
    const wallet: IWallet | null = await Wallet.findOne({ user: userObjectId as any });
    if (!wallet) {
      throw new Error("Wallet not found");
    }
    return { balance: wallet.balance };
  }

  static async addPaymentMethod(userId: string, paymentMethodId: string): Promise<AddPaymentMethodResult> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const wallet: IWallet | null = await Wallet.findOne({ user: userObjectId as any });
      if (!wallet) {
        throw new Error("Wallet not found");
      }

      const existingPaymentMethod: IPaymentMethod | null = await PaymentMethod.findOne({ stripePaymentMethodId: paymentMethodId });
      if (existingPaymentMethod) {
        logger.info(`Payment method ${paymentMethodId} already exists for user ${userId}`);
        return { message: "Payment method already exists for this user" };
      }

      const stripePaymentMethod = await StripeService.retrievePaymentMethod(paymentMethodId);

      await StripeService.attachPaymentMethodToCustomer(paymentMethodId, wallet.stripeCustomerId);

      const newPaymentMethod = new PaymentMethod({
        user: userId,
        stripePaymentMethodId: paymentMethodId,
        type: stripePaymentMethod.type,
        card: stripePaymentMethod.card ? {
          brand: stripePaymentMethod.card.brand,
          last4: stripePaymentMethod.card.last4,
          expMonth: stripePaymentMethod.card.exp_month,
          expYear: stripePaymentMethod.card.exp_year
        } : null,
        isDefault: false
      });

      await newPaymentMethod.save();

      try {
        await NotificationService.notifyPaymentMethodAdded(
            userId,
            stripePaymentMethod.card ? stripePaymentMethod.card.last4 : "bank account",
            stripePaymentMethod.card ? stripePaymentMethod.card.brand : "bank account"
        );
      } catch (notificationError) {
        logger.error(`Error sending notification: ${(notificationError as Error).message}`);
      }

      return {message: "Payment method added successfully"};
    } catch (error) {
      logger.error(`Error in addPaymentMethod for user ${userId}: ${(error as Error).message}`);
      throw new Error(`Failed to add payment method: ${(error as Error).message}`);
    }
  }

  static async listPaymentMethods(userId: string): Promise<PaymentMethodInfo[]> {
    try {
      const paymentMethods: IPaymentMethod[] = await PaymentMethod.find({ user: new Types.ObjectId(userId) as any });
      return paymentMethods.map(pm => ({
        id: pm.stripePaymentMethodId,
        type: pm.type,
        card: pm.card,
        isDefault: pm.isDefault
      }));
    } catch (error) {
      logger.error(`Error in listPaymentMethods for user ${userId}: ${(error as Error).message}`);
      throw new Error(`Failed to list payment methods: ${(error as Error).message}`);
    }
  }

  static async deletePaymentMethod(userId: string, paymentMethodId: string): Promise<DeletePaymentMethodResult> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const wallet: IWallet | null = await Wallet.findOne({ user: userObjectId as any });
      if (!wallet) {
        throw new Error("Wallet not found");
      }

      const paymentMethod: IPaymentMethod | null = await PaymentMethod.findOne({
        user: userObjectId as any,
        stripePaymentMethodId: paymentMethodId
      });

      if (!paymentMethod) {
        throw new Error("Payment method not found or does not belong to this user");
      }

      if (STRIPE_TEST_PAYMENT_METHODS.has(paymentMethodId)) {
        logger.info(`Attempted to delete test payment method ${paymentMethodId} for user ${userId}`);
        await PaymentMethod.deleteOne({ _id: paymentMethod._id });
        return { message: "Test payment method removed from user's account" };
      }

      try {
        await StripeService.detachPaymentMethod(paymentMethodId);
      } catch (stripeError: any) {
        if (stripeError.code === 'resource_missing') {
          logger.warn(`Payment method ${paymentMethodId} not found in Stripe, but exists in our database. Proceeding with local deletion.`);
        } else {
          throw stripeError;
        }
      }

      await PaymentMethod.deleteOne({ _id: paymentMethod._id });

      logger.info(`Payment method ${paymentMethodId} deleted for user ${userId}`);

      return { message: "Payment method successfully deleted" };
    } catch (error) {
      logger.error(`Error in deletePaymentMethod for user ${userId}: ${(error as Error).message}`);
      throw new Error(`Failed to delete payment method: ${(error as Error).message}`);
    }
  }


  static async withdraw(userId: string, amount: number): Promise<WithdrawResult> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const wallet: IWallet | null = await Wallet.findOne({ user: userObjectId as any });
      if (!wallet) {
        throw new Error("Wallet not found");
      }

      if (wallet.balance < amount) {
        throw new Error("Insufficient funds");
      }

      const payout = await StripeService.createPayout(
          amount,
          wallet.stripeCustomerId
      );

      wallet.balance -= amount;
      await wallet.save();

      const transaction = await this.createTransaction(
          "withdraw",
          amount,
          wallet._id,
          null,
          payout.id
      );

      await NotificationService.notifyWithdrawal(userId, amount, transaction._id, "completed", "bank_transfer");

      return { balance: wallet.balance, payoutId: payout.id };
    } catch (error) {
      logger.error("Error in withdraw:", error);
      throw new Error(`Withdrawal failed: ${(error as Error).message}`);
    }
  }

  static async transfer(fromUserId: string, toUserId: string, amount: number): Promise<TransferResult> {
    try {
      const fromUserObjectId = new Types.ObjectId(fromUserId);
      const toUserObjectId = new Types.ObjectId(toUserId);

      // Find wallets using ObjectIds
      const fromWallet: IWallet | null = await Wallet.findOne({ user: fromUserObjectId as any });
      const toWallet: IWallet | null = await Wallet.findOne({ user: toUserObjectId as any });
      if (!fromWallet || !toWallet) {
        throw new Error("One or both wallets not found");
      }

      if (fromWallet.balance < amount) {
        throw new Error("Insufficient funds");
      }

      fromWallet.balance -= amount;
      toWallet.balance += amount;

      await fromWallet.save();
      await toWallet.save();

      const transaction = await this.createTransaction(
          "transfer",
          amount,
          fromWallet._id,
          toWallet._id
      );

      await NotificationService.notifyTransfer(
          fromUserId,
          toUserId,
          amount,
          transaction._id,
          fromWallet.balance,
          toWallet.balance
      );

      return { fromBalance: fromWallet.balance, toBalance: toWallet.balance };
    } catch (error) {
      logger.error("Error in transfer:", error);
      throw new Error(`Transfer failed: ${(error as Error).message}`);
    }
  }

  static async getTransactions(userId: string): Promise<ITransaction[]> {
    const userObjectId = new Types.ObjectId(userId);
    const wallet: IWallet | null = await Wallet.findOne({ user: userId as any });
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const transactions: ITransaction[] = await Transaction.find({
      $or: [{ fromWallet: wallet._id }, { toWallet: wallet._id }],
    }).sort({ createdAt: -1 });

    return transactions;
  }

  static async generatePaymentQR(userId: string, amount: number): Promise<QRCodeResult> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const wallet: IWallet | null = await Wallet.findOne({ user: userId as any});
      if (!wallet) {
        throw new Error("Wallet not found");
      }

      const randomBytesHex = randomBytes(16).toString('hex');
      const paymentId = `payment_${randomBytesHex}`;

      const qrData = JSON.stringify({
        paymentId,
        amount,
        recipient: userId,
      });

      const qrCodeDataURL = await qrcode.toDataURL(qrData);

      await this.createTransaction(
          "transfer",
          amount,
          null,
          wallet._id,
          null,
          "pending",
          { paymentId }
      );

      return { qrCodeDataURL, paymentId };
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${(error as Error).message}`);
    }
  }

  static async initiateQRPayment(paymentId: string, payerId: string, paymentMethodId: string): Promise<InitiateQRPaymentResult> {
    logger.info(
        `Initiating QR payment: paymentId=${paymentId}, payerId=${payerId}, paymentMethodId=${paymentMethodId}`
    );

    try {
      if (!paymentId || !payerId || !paymentMethodId) {
        throw new Error("Missing required parameters");
      }

      const transaction: ITransaction | null = await Transaction.findOne({
        "metadata.paymentId": paymentId,
        status: "pending",
      });
      logger.info(`Found transaction: ${JSON.stringify(transaction)}`);

      if (!transaction) {
        throw new Error("Invalid payment ID");
      }

      const payerObjectId = new Types.ObjectId(payerId);
      const payerWallet: IWallet | null = await Wallet.findOne({ user: payerId as any });
      logger.info(`Found payer wallet: ${JSON.stringify(payerWallet)}`);

      if (!payerWallet) {
        throw new Error("Payer wallet not found");
      }

      if (payerWallet.balance < transaction.amount) {
        throw new Error("Insufficient funds");
      }

      const paymentMethod: PaymentMethod | null = await PaymentMethod.findOne({
        user: new Types.ObjectId(payerId) as any,
        stripePaymentMethodId: paymentMethodId
      });

      if (!paymentMethod) {
        throw new Error("Payment method not found or does not belong to this user");
      }

      transaction.fromWallet = payerWallet._id;
      await transaction.save();

      let paymentIntent: any;
      if (STRIPE_TEST_PAYMENT_METHODS.has(paymentMethodId)) {
        paymentIntent = {
          id: `pi_simulated_${randomBytes(16).toString("hex")}`,
          client_secret: `seti_simulated_${randomBytes(16).toString("hex")}`,
          status: "requires_confirmation",
          amount: transaction.amount * 100
        };
        logger.info(`Simulated payment intent for test payment method: ${JSON.stringify(paymentIntent)}`);
      } else {
        paymentIntent = await StripeService.createPaymentIntent(
            transaction.amount * 100,
            "usd",
            payerWallet.stripeCustomerId,
            paymentMethodId
        );
      }

      transaction.stripePaymentIntentId = paymentIntent.id;
      await transaction.save();

      return {
        clientSecret: paymentIntent.client_secret,
        amount: transaction.amount,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      };
    } catch (error) {
      logger.error(`Error in initiateQRPayment: ${(error as Error).message}`);
      logger.error((error as Error).stack);
      throw new Error(`Failed to initiate QR payment: ${(error as Error).message}`);
    }
  }

  static async confirmQRPayment(payerId: string, paymentIntentId: string, paymentMethodId: string): Promise<ConfirmQRPaymentResult> {
    try {
      const paymentMethod: IPaymentMethod | null = await PaymentMethod.findOne({
        user: payerId as any,
        stripePaymentMethodId: paymentMethodId
      });

      if (!paymentMethod) {
        throw new Error("Payment method not found or does not belong to this user");
      }

      let paymentIntent: any;
      if (STRIPE_TEST_PAYMENT_METHODS.has(paymentMethodId)) {
        paymentIntent = {
          id: paymentIntentId,
          status: "succeeded"
        };
        logger.info(`Simulated QR payment confirmation for test payment method: ${JSON.stringify(paymentIntent)}`);
      } else {
        paymentIntent = await StripeService.confirmPaymentIntent(
            paymentIntentId,
            paymentMethodId
        );
      }

      if (paymentIntent.status === "succeeded") {
        const transaction: ITransaction | null = await Transaction.findOne({
          stripePaymentIntentId: paymentIntentId,
        }).populate('toWallet');
        if (!transaction) {
          throw new Error("Transaction not found");
        }

        transaction.status = "completed";
        await transaction.save();

        const recipientWallet: IWallet | null = await Wallet.findById(transaction.toWallet);
        if (!recipientWallet) {
          throw new Error("Recipient wallet not found");
        }
        recipientWallet.balance += transaction.amount;
        await recipientWallet.save();

        const payerObjectId = new Types.ObjectId(payerId);
        const payerWallet: IWallet | null = await Wallet.findOne({ user: payerId as any });
        if (!payerWallet) {
          throw new Error("Payer wallet not found");
        }
        payerWallet.balance -= transaction.amount;
        await payerWallet.save();

        await NotificationService.notifyQRPayment(
            payerId,
            recipientWallet.user.toString(),
            transaction.amount,
            transaction._id,
            "sent"
        );
        await NotificationService.notifyQRPayment(
            recipientWallet.user.toString(),
            payerId,
            transaction.amount,
            transaction._id,
            "received"
        );

        return { message: "Payment processed successfully", paymentIntentId };
      } else {
        throw new Error("Payment failed");
      }
    } catch (error) {
      logger.error("Error in confirmQRPayment:", error);
      throw new Error(`Failed to confirm QR payment: ${(error as Error).message}`);
    }
  }

  static async createTransaction(
      type: string,
      amount: number,
      fromWalletId: mongoose.Types.ObjectId | null,
      toWalletId: mongoose.Types.ObjectId | null,
      stripePaymentIntentId: string | null = null,
      status: string = "completed",
      metadata: Record<string, any> = {}
  ): Promise<ITransaction> {
    const transaction = new Transaction({
      type,
      amount,
      fromWallet: fromWalletId,
      toWallet: toWalletId,
      status,
      stripePaymentIntentId,
      metadata,
    });

    await transaction.save();
    return transaction;
  }
}

export default WalletService;