import Wallet, {IWallet} from '../models/wallet.model';
import PaymentMethod from '../models/payment-method.model';
import Transaction from '../models/transaction.model';
import { ITransaction } from "../models/transaction.model"; // For named export


import StripeService from './stripe.service';
import KYCVerification, {IKYCVerification} from '../models/kyc-verification.model';
import NotificationService from './notification.service';
import crypto from 'crypto';
//import qrcode from 'qrcode';
import logger from '../utils/logger';
import mongoose from "mongoose";


const STRIPE_TEST_PAYMENT_METHODS = new Set<string>([
    'pm_card_visa',
    'pm_card_mastercard',
    'pm_card_amex',
    'pm_card_discover',
    'pm_card_diners',
    'pm_card_jcb',
    'pm_card_unionpay',
    'pm_card_visa_debit',
    'pm_card_mastercard_prepaid',
    'pm_card_threeDSecure2Required',
    'pm_usBankAccount',
    'pm_sepaDebit',
    'pm_bacsDebit',
    'pm_alipay',
    'pm_wechat'
]);

export {
    Wallet,
    PaymentMethod,
    Transaction,
    StripeService,
    KYCVerification,
    NotificationService,
    crypto,
    //qrcode,
    logger,
    STRIPE_TEST_PAYMENT_METHODS
};

interface CreateWalletParams {
    userId: string;
    email?: string;
    initialBalance: number;
}

interface DepositParams {
    userId: string;
    amount: number;
    paymentMethodId: string;
}

interface DepositResponse {
    balance: number;
    transactionId: string;
}
interface TransferParams {
    fromUserId: string;
    toUserId: string;
    amount: number;
}



class WalletService {
    static async createWallet({
                                  userId,
                                  email,
                                  initialBalance
                              }: CreateWalletParams): Promise<IWallet> {
        try {
            // Validate inputs
            if (!userId || !email || initialBalance === undefined || initialBalance < 0) {
                throw new Error("User ID, email, and a valid initial balance are required.");
            }

            // Log userId
            logger.info("User ID passed to createWallet:", userId);

            // Check KYC status first
            const kycVerification = await KYCVerification.findOne({ user: userId }).sort({ createdAt: -1 });
            logger.info("KYC Verification Retrieved:", kycVerification);

            if (!kycVerification) {
                throw new Error("No KYC verification record found.");
            }

            // Log the raw status value
            logger.info("KYC Status Retrieved:", kycVerification.status);

            // Normalize and check KYC status
            if (kycVerification.status.trim().toLowerCase() !== "approved") {
                throw new Error("KYC verification is not approved. Cannot create wallet.");
            }

            // Check if user already has a wallet
            const existingWallet: IWallet | null = await Wallet.findOne({ user: userId });
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
                // Send notification for initial balance as a deposit
                const notificationService = new NotificationService();
                await notificationService.notifyDeposit(userId, initialBalance, transaction._id.toString());
            }

            logger.info(`Wallet created for user ${userId} with initial balance ${initialBalance}`);

            return wallet;
        } catch (error) {
            logger.error("Error in createWallet:", error);
            throw new Error(`Failed to create wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async deposit({
                             userId,
                             amount,
                             paymentMethodId
                         }: DepositParams): Promise<DepositResponse> {
        try {
            const wallet: IWallet | null = await Wallet.findOne({user: userId});
            if (!wallet) {
                throw new Error("Wallet not found");
            }

            const paymentMethod = await PaymentMethod.findOne({
                user: userId,
                stripePaymentMethodId: paymentMethodId
            });

            if (!paymentMethod) {
                throw new Error("Payment method not found or does not belong to this user");
            }

            let paymentIntent: any;
            if (STRIPE_TEST_PAYMENT_METHODS.has(paymentMethodId)) {
                // For test payment methods, we'll simulate a successful payment
                paymentIntent = {
                    id: `pi_simulated_${crypto.randomBytes(16).toString("hex")}`,
                    status: "succeeded",
                    amount: amount * 100 // Convert to cents for consistency with Stripe
                };
                logger.info(`Simulated payment intent for test payment method: ${JSON.stringify(paymentIntent)}`);
            } else {
                // For real payment methods, proceed with Stripe
                paymentIntent = await StripeService.createPaymentIntent(
                    amount * 100, // Convert to cents for Stripe
                    "usd",
                    wallet.stripeCustomerId,
                );

                paymentIntent = await StripeService.confirmPaymentIntent(
                    paymentIntent.id,
                    paymentMethodId
                );
            }

            if (paymentIntent.status === "succeeded") {
                const depositAmount = paymentIntent.amount / 100; // Convert back to dollars
                wallet.balance += depositAmount;
                await wallet.save();

                const transaction = await this.createTransaction(
                    "deposit",
                    depositAmount,
                    null,
                    wallet._id,
                    paymentIntent.id
                );

                // Send notification
                const notificationService = new NotificationService();
                const userIdString: string = wallet.user.toString();
                await notificationService.notifyDeposit(userIdString, depositAmount, transaction._id.toString());

                return {
                    balance: wallet.balance,
                    transactionId: paymentIntent.id
                };
            } else {
                throw new Error("Deposit failed");
            }
        } catch (error) {
            logger.error("Error in deposit:", error);
            throw new Error(`Deposit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }


    static async createPaymentIntent(userId: string, amount: number): Promise<{
        clientSecret: string,
        paymentIntentId: string
    }> {
        const wallet = await Wallet.findOne({user: userId});
        if (!wallet) {
            throw new Error("Wallet not found");
        }

        const paymentIntent = await StripeService.createPaymentIntent(
            amount,
            "usd",
            wallet.stripeCustomerId,
        );

        const clientSecret = paymentIntent.client_secret ?? '';
        return {
            clientSecret,
            paymentIntentId: paymentIntent.id,
        };
    }

    static async confirmPaymentIntent(userId: string, paymentIntentId: string, paymentMethodId: string): Promise<{
        balance: number,
        transactionId: string
    }> {
        const wallet = await Wallet.findOne({user: userId});
        if (!wallet) {
            throw new Error("Wallet not found");
        }

        const paymentMethod = await PaymentMethod.findOne({
            user: userId,
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

            const notificationService = new NotificationService();
            await notificationService.notifyDeposit(userId, amount, transaction._id.toString());

            return {balance: wallet.balance, transactionId: paymentIntent.id};
        } else {
            throw new Error("Payment failed");
        }
    }


    static async getPaymentStatus(userId: string, paymentIntentId: string): Promise<{
        status: string;
        amount: number;
        createdAt: Date;
        updatedAt: Date
    }> {
        // Find the transaction and populate the 'fromWallet' field
        const transaction = await Transaction.findOne({stripePaymentIntentId: paymentIntentId})
            .populate('fromWallet') as ITransaction  | null;

        if (!transaction || !transaction.fromWallet) {
            throw new Error("Payment not found or does not belong to this user");
        }

        // Ensure the wallet belongs to the user
        if (transaction.fromWallet.toString() !== userId) {
            throw new Error("Payment not found or does not belong to this user");
        }

        // Return the transaction details
        return {
            status: transaction.status,
            amount: transaction.amount,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt,
        };
    }


    static async getBalance(userId: string): Promise<{ balance: number }> {
        // Find the wallet for the specified userId
        const wallet = await Wallet.findOne({user: userId}).exec();

        // Check if the wallet exists
        if (!wallet) {
            throw new Error("Wallet not found");
        }

        // Return the balance
        return {balance: wallet.balance};
    }

    static async addPaymentMethod(userId: string, paymentMethodId: string): Promise<{ message: string }> {
        try {
            const wallet = await Wallet.findOne({user: userId});
            if (!wallet) {
                throw new Error("Wallet not found");
            }

            const existingPaymentMethod = await PaymentMethod.findOne({stripePaymentMethodId: paymentMethodId});
            if (existingPaymentMethod) {
                logger.info(`Payment method ${paymentMethodId} already exists for user ${userId}`);
                return {message: "Payment method already exists for this user"};
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
                const notificationService = new NotificationService();
                await notificationService.notifyPaymentMethodAdded(
                    userId,
                    stripePaymentMethod.type
                );
            } catch (notificationError) {
                logger.error(`Error sending notification: ${notificationError instanceof Error ? notificationError.message : 'Unknown error'}`);
            }

            return {message: "Payment method added successfully"};
        } catch (error) {
            logger.error(`Error in addPaymentMethod for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error(`Failed to add payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async listPaymentMethods(userId: string): Promise<Array<{
        id: string,
        type: string,
        card: any,
        isDefault: boolean
    }>> {
        try {
            const paymentMethods = await PaymentMethod.find({user: userId}).sort({createdAt: -1});

            return paymentMethods.map(pm => ({
                id: pm.stripePaymentMethodId,
                type: pm.type,
                card: pm.card,
                isDefault: pm.isDefault
            }));
        } catch (error) {
            logger.error(`Error in listPaymentMethods for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error(`Failed to list payment methods: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }


    static async deletePaymentMethod(userId: string, paymentMethodId: string): Promise<{ message: string }> {
        try {
            const wallet: IWallet | null = await Wallet.findOne({user: userId}).exec();
            if (!wallet) {
                throw new Error("Wallet not found");
            }

            const paymentMethod = await PaymentMethod.findOne({
                user: userId,
                stripePaymentMethodId: paymentMethodId
            });

            if (!paymentMethod) {
                throw new Error("Payment method not found or does not belong to this user");
            }

            if (STRIPE_TEST_PAYMENT_METHODS.has(paymentMethodId)) {
                logger.info(`Attempted to delete test payment method ${paymentMethodId} for user ${userId}`);
                await PaymentMethod.deleteOne({_id: paymentMethod._id}).exec();
                return {message: "Test payment method removed from user's account"};
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

            await PaymentMethod.deleteOne({_id: paymentMethod._id}).exec();

            logger.info(`Payment method ${paymentMethodId} deleted for user ${userId}`);

            return {message: "Payment method successfully deleted"};
        } catch (error) {
            logger.error(`Error in deletePaymentMethod for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error(`Failed to delete payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async withdraw(userId: string, amount: number): Promise<{ balance: number, payoutId: string }> {
        try {
            const wallet = await Wallet.findOne({user: userId});
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

            const notificationService = new NotificationService();
            await notificationService.notifyWithdrawal(userId, amount, transaction._id.toString());

            return {balance: wallet.balance, payoutId: payout.id};
        } catch (error) {
            // Check if the error is an instance of Error
            if (error instanceof Error) {
                logger.error("Error in withdraw:", error);
                throw new Error(`Withdrawal failed: ${error.message}`);
            } else {
                // Handle case where the error is not an instance of Error
                logger.error("Unknown error in withdraw:", error);
                throw new Error("Withdrawal failed due to an unknown error");
            }
        }
    }

    static async transfer({
                              fromUserId,
                              toUserId,
                              amount
                          }: TransferParams): Promise<{ fromBalance: number; toBalance: number }> {
        try {
            const fromWallet = await Wallet.findOne({ user: fromUserId }).exec();
            const toWallet = await Wallet.findOne({ user: toUserId }).exec();

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

            const notificationService = new NotificationService();
            await notificationService.notifyTransfer(
                fromUserId,
                transaction._id.toString(),
                amount.toString(),
            );

            return { fromBalance: fromWallet.balance, toBalance: toWallet.balance };
        } catch (error) {
            if (error instanceof Error) {
                logger.error("Error in transfer:", error);
                throw new Error(`Transfer failed: ${error.message}`);
            } else {
                logger.error("Unknown error in transfer:", error);
                throw new Error("Transfer failed due to an unknown error");
            }
        }
    }
    static async createTransaction(
        type: string,
        amount: number,
        fromWalletId: string | null,
        toWalletId: string | null,
        stripePaymentIntentId: string | null = null,
        status: string = "completed",
        metadata: object = {}
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

    static async getTransactions(userId: string): Promise<ITransaction[]> {
        try {
            const wallet = await Wallet.findOne({ user: userId }).exec();
            if (!wallet) {
                throw new Error("Wallet not found");
            }

            const transactions = await Transaction.find({
                $or: [{ fromWallet: wallet._id }, { toWallet: wallet._id }],
            }).sort({ createdAt: -1 }).exec();

            return transactions;
        } catch (error) {
            if (error instanceof Error) {
                logger.error("Error in getTransactions:", error);
                throw new Error(`Failed to get transactions: ${error.message}`);
            } else {
                logger.error("Unknown error in getTransactions:", error);
                throw new Error("Failed to get transactions due to an unknown error");
            }
        }
    }

   /* static async generatePaymentQR(userId, amount) {
        try {
            const wallet = await Wallet.findOne({user: userId});
            if (!wallet) {
                throw new Error("Wallet not found");
            }

            const paymentId = crypto.randomBytes(16).toString("hex");

            const qrData = JSON.stringify({
                paymentId,
                amount,
                recipient: userId,
            });

            const qrCodeDataURL = await qrcode.toDataURL(qrData);

            // Create a pending transaction
            await this.createTransaction(
                "transfer",
                amount,
                null, // fromWallet is null for QR code generation
                wallet._id,
                null,
                "pending",
                {paymentId}
            );

            return {qrCodeDataURL, paymentId};
        } catch (error) {
            throw new Error(`Failed to generate QR code: ${error.message}`);
        }
    }*/

    /*static async initiateQRPayment(paymentId, payerId, paymentMethodId) {
        logger.info(
            `Initiating QR payment: paymentId=${paymentId}, payerId=${payerId}, paymentMethodId=${paymentMethodId}`
        );

        try {
            if (!paymentId || !payerId || !paymentMethodId) {
                throw new Error("Missing required parameters");
            }

            const transaction = await Transaction.findOne({
                "metadata.paymentId": paymentId,
                status: "pending",
            });
            logger.info(`Found transaction: ${JSON.stringify(transaction)}`);

            if (!transaction) {
                throw new Error("Invalid payment ID");
            }

            const payerWallet = await Wallet.findOne({user: payerId});
            logger.info(`Found payer wallet: ${JSON.stringify(payerWallet)}`);

            if (!payerWallet) {
                throw new Error("Payer wallet not found");
            }

            if (payerWallet.balance < transaction.amount) {
                throw new Error("Insufficient funds");
            }

            const paymentMethod = await PaymentMethod.findOne({
                user: payerId,
                stripePaymentMethodId: paymentMethodId
            });

            if (!paymentMethod) {
                throw new Error("Payment method not found or does not belong to this user");
            }

            // Set the fromWallet
            transaction.fromWallet = payerWallet._id;
            await transaction.save();

            let paymentIntent;
            if (STRIPE_TEST_PAYMENT_METHODS.has(paymentMethodId)) {
                // For test payment methods, we'll simulate a payment intent
                paymentIntent = {
                    id: `pi_simulated_${crypto.randomBytes(16).toString("hex")}`,
                    client_secret: `seti_simulated_${crypto.randomBytes(16).toString("hex")}`,
                    status: "requires_confirmation",
                    amount: transaction.amount * 100 // Convert to cents for consistency
                };
                logger.info(`Simulated payment intent for test payment method: ${JSON.stringify(paymentIntent)}`);
            } else {
                // For real payment methods, proceed with Stripe
                paymentIntent = await StripeService.createPaymentIntent(
                    transaction.amount * 100, // Convert to cents
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
            logger.error(`Error in initiateQRPayment: ${error.message}`);
            logger.error(error.stack);
            throw new Error(`Failed to initiate QR payment: ${error.message}`);
        }
    }

    static async confirmQRPayment(payerId, paymentIntentId, paymentMethodId) {
        try {
            const paymentMethod = await PaymentMethod.findOne({
                user: payerId,
                stripePaymentMethodId: paymentMethodId
            });

            if (!paymentMethod) {
                throw new Error("Payment method not found or does not belong to this user");
            }

            let paymentIntent;
            if (STRIPE_TEST_PAYMENT_METHODS.has(paymentMethodId)) {
                // For test payment methods, we'll simulate a successful confirmation
                paymentIntent = {
                    id: paymentIntentId,
                    status: "succeeded"
                };
                logger.info(`Simulated QR payment confirmation for test payment method: ${JSON.stringify(paymentIntent)}`);
            } else {
                // For real payment methods, proceed with Stripe
                paymentIntent = await StripeService.confirmPaymentIntent(
                    paymentIntentId,
                    paymentMethodId
                );
            }

            if (paymentIntent.status === "succeeded") {
                const transaction = await Transaction.findOne({
                    stripePaymentIntentId: paymentIntentId,
                }).populate('toWallet');
                if (!transaction) {
                    throw new Error("Transaction not found");
                }

                transaction.status = "completed";
                await transaction.save();

                const recipientWallet = await Wallet.findById(transaction.toWallet);
                if (!recipientWallet) {
                    throw new Error("Recipient wallet not found");
                }
                recipientWallet.balance += transaction.amount;
                await recipientWallet.save();

                const payerWallet = await Wallet.findOne({user: payerId});
                if (!payerWallet) {
                    throw new Error("Payer wallet not found");
                }
                payerWallet.balance -= transaction.amount;
                await payerWallet.save();

                // Send notifications
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

                return {message: "Payment processed successfully", paymentIntentId};
            } else {
                throw new Error("Payment failed");
            }
        } catch (error) {
            logger.error("Error in confirmQRPayment:", error);
            throw new Error(`Failed to confirm QR payment: ${error.message}`);
        }
    }*/


}

export default WalletService;
