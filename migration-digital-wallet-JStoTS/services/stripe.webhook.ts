import Stripe from 'stripe';

class StripeService {
  private static stripe: Stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2023-08-16' as unknown as Stripe.StripeConfig['apiVersion'],
  });

  static async createCustomer(email: string): Promise<Stripe.Customer> {
    return await this.stripe.customers.create({ email });
  }

  static async createPaymentMethod(
      type: 'card' | 'bank_account',
      card: Stripe.PaymentMethodCreateParams.Card1
  ): Promise<Stripe.PaymentMethod> {
    return await this.stripe.paymentMethods.create({
      type: 'card',
      card: { ...card } as Stripe.PaymentMethodCreateParams.Card1,
    });
  }

  static async attachPaymentMethodToCustomer(
      paymentMethodId: string,
      customerId: string
  ): Promise<Stripe.PaymentMethod> {
    return await this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  }

  static async listCustomerPaymentMethods(
      customerId: string
  ): Promise<Stripe.ApiList<Stripe.PaymentMethod>> {
    return await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
  }

  static async createPaymentIntent(
      amount: number,
      currency: string,
      customerId: string,
      paymentMethodId: string
  ): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true,
    });
  }
}

export default StripeService;
