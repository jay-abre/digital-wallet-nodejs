import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2020-08-27' });
class StripeService {
    static async createCustomer(email) {
        return await stripe.customers.create({ email });
    }
    static async createPaymentMethod(type, card) {
        return await stripe.paymentMethods.create({ card });
    }
    static async attachPaymentMethodToCustomer(paymentMethodId, customerId) {
        return await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    }
    static async listCustomerPaymentMethods(customerId) {
        return await stripe.paymentMethods.list({
            customer: customerId,
            type: 'card',
        });
    }
    static async createPaymentIntent(amount, currency, customerId, paymentMethodId) {
        return await stripe.paymentIntents.create({
            amount,
            currency,
            customer: customerId,
            payment_method: paymentMethodId,
            confirm: true,
        });
    }
}
export default StripeService;
