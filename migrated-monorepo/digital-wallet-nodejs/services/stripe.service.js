import { Stripe } from 'stripe';
import Logger from '../utils/logger';
import config from '../config';
const stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: '2020-08-27'
});
class StripeService {
    static async createCustomer(email) {
        try {
            const customer = await stripe.customers.create({ email });
            Logger.info(`Created Stripe customer for email: ${email}`);
            return customer;
        }
        catch (error) {
            Logger.error(`Error creating Stripe customer: ${error.message}`);
            throw new Error(`Failed to create Stripe customer: ${error.message}`);
        }
    }
    async createPaymentMethod(type, card) {
        try {
            const paymentMethod = await stripe.paymentMethods.create({
                type,
                card,
            });
            Logger.info(`Created payment method: ${JSON.stringify(paymentMethod)}`);
            return paymentMethod;
        }
        catch (error) {
            Logger.error(`Error creating payment method: ${error.message}`);
            throw new Error(`Failed to create payment method: ${error.message}`);
        }
    }
    static async createPaymentIntent(amount, currency, customerId, paymentMethodId) {
        Logger.info(`Creating PaymentIntent: amount=${amount}, currency=${currency}, customerId=${customerId}, paymentMethodId=${paymentMethodId}`);
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount * 100, // Convert to cents
                currency,
                customer: customerId,
                payment_method: paymentMethodId,
                setup_future_usage: paymentMethodId ? 'off_session' : undefined,
            });
            Logger.info(`PaymentIntent created: ${JSON.stringify(paymentIntent)}`);
            return paymentIntent;
        }
        catch (error) {
            Logger.error(`Error creating PaymentIntent: ${error.message}`);
            throw new Error(`Failed to create PaymentIntent: ${error.message}`);
        }
    }
    static async confirmPaymentIntent(paymentIntentId, paymentMethodId) {
        try {
            const confirmedPaymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
                payment_method: paymentMethodId,
            });
            Logger.info(`Confirmed PaymentIntent: ${paymentIntentId}`);
            return confirmedPaymentIntent;
        }
        catch (error) {
            Logger.error(`Error confirming PaymentIntent: ${error.message}`);
            throw new Error(`Failed to confirm PaymentIntent: ${error.message}`);
        }
    }
    static async createPayout(amount, customerId) {
        try {
            const payout = await stripe.payouts.create({
                amount: amount * 100, // Convert to cents
                currency: 'usd',
                method: 'instant',
            }, {
                stripeAccount: customerId,
            });
            Logger.info(`Created payout for customer ${customerId}: ${JSON.stringify(payout)}`);
            return payout;
        }
        catch (error) {
            Logger.error(`Error creating payout: ${error.message}`);
            throw new Error(`Failed to create payout: ${error.message}`);
        }
    }
    static async listPaymentMethods(customerId) {
        try {
            const paymentMethods = await stripe.paymentMethods.list({
                customer: customerId,
                type: 'card',
            });
            Logger.debug(`Retrieved ${paymentMethods.data.length} payment methods for customer ${customerId}`);
            return paymentMethods;
        }
        catch (error) {
            Logger.error(`Error listing payment methods: ${error.message}`);
            throw new Error(`Failed to list payment methods: ${error.message}`);
        }
    }
    static async retrievePaymentMethod(paymentMethodId) {
        try {
            const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
            Logger.debug(`Retrieved payment method ${paymentMethodId}`);
            return paymentMethod;
        }
        catch (error) {
            Logger.error(`Error retrieving payment method ${paymentMethodId}: ${error.message}`);
            throw new Error(`Failed to retrieve payment method: ${error.message}`);
        }
    }
    static async attachPaymentMethodToCustomer(paymentMethodId, customerId) {
        try {
            const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
            Logger.debug(`Retrieved payment method before attachment: ${JSON.stringify(paymentMethod)}`);
            if (paymentMethod.customer === customerId) {
                Logger.info(`Payment method ${paymentMethodId} is already attached to customer ${customerId}`);
                return paymentMethod;
            }
            if (paymentMethod.customer) {
                await stripe.paymentMethods.detach(paymentMethodId);
                Logger.info(`Detached payment method ${paymentMethodId} from previous customer`);
            }
            const attachedPaymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
                customer: customerId,
            });
            Logger.info(`Payment method ${paymentMethodId} attached to customer ${customerId}`);
            Logger.debug(`Attached payment method response: ${JSON.stringify(attachedPaymentMethod)}`);
            return attachedPaymentMethod;
        }
        catch (error) {
            Logger.error(`Error in attachPaymentMethodToCustomer: ${error.message}`);
            Logger.error(`Error details: ${JSON.stringify(error)}`);
            throw new Error(`Failed to attach payment method: ${error.message}`);
        }
    }
    static async detachPaymentMethod(paymentMethodId) {
        try {
            const detachedPaymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
            Logger.info(`Detached payment method ${paymentMethodId}`);
            return detachedPaymentMethod;
        }
        catch (error) {
            Logger.error(`Error detaching payment method ${paymentMethodId}: ${error.message}`);
            throw new Error(`Failed to detach payment method: ${error.message}`);
        }
    }
}
export default StripeService;
