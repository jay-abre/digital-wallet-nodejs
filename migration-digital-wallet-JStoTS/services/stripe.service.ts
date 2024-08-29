import {Stripe} from 'stripe';
import config from '../config';
import logger from '../utils/logger';

const stripe = new Stripe(config.stripeSecretKey as string, {
    apiVersion: '2023-08-16' as any, // Assert to `any` to bypass the type restriction
});

class StripeService {
    static async createCustomer(email: string): Promise<Stripe.Customer> {
        try {
            const customer = await stripe.customers.create({email});
            logger.info(`Created Stripe customer for email: ${email}`);
            return customer;
        } catch (error: any) {
            logger.error(`Error creating Stripe customer: ${error.message}`);
            throw new Error(`Failed to create Stripe customer: ${error.message}`);
        }
    }


    static async createPaymentIntent(
        amount: number,
        currency: string,
        customerId: string,
        paymentMethodId?: string
    ): Promise<Stripe.PaymentIntent> {
        logger.info(
            `Creating PaymentIntent: amount=${amount}, currency=${currency}, customerId=${customerId}, paymentMethodId=${paymentMethodId}`
        );

        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount,
                currency,
                customer: customerId,
                payment_method: paymentMethodId,
                setup_future_usage: 'off_session',
            });

            logger.info(`PaymentIntent created: ${JSON.stringify(paymentIntent)}`);
            return paymentIntent;
        } catch (error: any) {
            logger.error(`Error creating PaymentIntent: ${error.message}`);
            throw new Error(`Failed to create PaymentIntent: ${error.message}`);
        }
    }

    static async confirmPaymentIntent(
        paymentIntentId: string,
        paymentMethodId: string
    ): Promise<Stripe.PaymentIntent> {
        try {
            const confirmedPaymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
                payment_method: paymentMethodId,
            });
            logger.info(`Confirmed PaymentIntent: ${paymentIntentId}`);
            return confirmedPaymentIntent;
        } catch (error: any) {
            logger.error(`Error confirming PaymentIntent: ${error.message}`);
            throw new Error(`Failed to confirm PaymentIntent: ${error.message}`);
        }
    }

    static async createPayout(amount: number, customerId: string): Promise<Stripe.Payout> {
        try {
            const payout = await stripe.payouts.create({
                amount: amount * 100, // Convert to cents
                currency: 'usd',
                method: 'instant',
            }, {
                stripeAccount: customerId,
            });
            logger.info(`Created payout for customer ${customerId}: ${JSON.stringify(payout)}`);
            return payout;
        } catch (error: any) {
            logger.error(`Error creating payout: ${error.message}`);
            throw new Error(`Failed to create payout: ${error.message}`);
        }
    }

    static async listPaymentMethods(customerId: string): Promise<Stripe.ApiList<Stripe.PaymentMethod>> {
        try {
            const paymentMethods = await stripe.paymentMethods.list({
                customer: customerId,
                type: 'card',
            });
            logger.debug(`Retrieved ${paymentMethods.data.length} payment methods for customer ${customerId}`);
            return paymentMethods;
        } catch (error: any) {
            logger.error('Error listing payment methods:', error);
            throw new Error(`Failed to list payment methods: ${error.message}`);
        }
    }

    static async retrievePaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
        try {
            const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
            logger.debug(`Retrieved payment method ${paymentMethodId}`);
            return paymentMethod;
        } catch (error: any) {
            logger.error(`Error retrieving payment method ${paymentMethodId}:`, error);
            throw new Error(`Failed to retrieve payment method: ${error.message}`);
        }
    }

    static async attachPaymentMethodToCustomer(paymentMethodId: string, customerId: string): Promise<Stripe.PaymentMethod> {
        try {
            const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
            logger.debug(`Retrieved payment method before attachment: ${JSON.stringify(paymentMethod)}`);

            if (paymentMethod.customer === customerId) {
                logger.info(`Payment method ${paymentMethodId} is already attached to customer ${customerId}`);
                return paymentMethod;
            }

            if (paymentMethod.customer) {
                await stripe.paymentMethods.detach(paymentMethodId);
                logger.info(`Detached payment method ${paymentMethodId} from previous customer`);
            }

            const attachedPaymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
                customer: customerId,
            });

            logger.info(`Payment method ${paymentMethodId} attached to customer ${customerId}`);
            logger.debug(`Attached payment method response: ${JSON.stringify(attachedPaymentMethod)}`);
            return attachedPaymentMethod;
        } catch (error: any) {
            logger.error(`Error in attachPaymentMethodToCustomer: ${error.message}`);
            throw new Error(`Failed to attach payment method: ${error.message}`);
        }
    }

    static async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
        try {
            const detachedPaymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
            logger.info(`Detached payment method ${paymentMethodId}`);
            return detachedPaymentMethod;
        } catch (error: any) {
            logger.error(`Error detaching payment method ${paymentMethodId}:`, error);
            throw new Error(`Failed to detach payment method: ${error.message}`);
        }
    }

    static async createPaymentMethod(card: any): Promise<Stripe.PaymentMethod> {
        try {
            const paymentMethod = await stripe.paymentMethods.create({
                type: 'card',
                card: {
                    number: card.number,
                    exp_month: card.exp_month,
                    exp_year: card.exp_year,
                    cvc: card.cvc,
                },
            });
            logger.info(`Created payment method: ${JSON.stringify(paymentMethod)}`);
            return paymentMethod;
        } catch (error: any) {
            logger.error(`Error creating payment method: ${error.message}`);
            throw new Error(`Failed to create payment method: ${error.message}`);
        }
    }
}

export default StripeService;
