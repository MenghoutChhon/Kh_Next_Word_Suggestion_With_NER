/**
 * Stripe Integration Configuration
 * 
 * This file contains the configuration and setup for Stripe payment integration.
 * Replace DEMO mode with real Stripe integration in production.
 * 
 * To enable Stripe:
 * 1. Install: npm install stripe
 * 2. Set STRIPE_SECRET_KEY in .env
 * 3. Uncomment the code below
 */

import { config } from '../../config/env';

// Stripe types (for development without installing the package)
type StripeCheckoutSession = any;
type StripeCustomer = any;
type StripeSubscription = any;
type StripeEvent = any;

// Uncomment when Stripe is installed:
// import Stripe from 'stripe';
// export const stripe = config.stripe?.secretKey 
//   ? new Stripe(config.stripe.secretKey, {
//       apiVersion: '2024-11-20.acacia',
//     })
//   : null;

// Temporary: Stripe not initialized (install 'stripe' package to enable)
export const stripe = null;

// Price IDs for products (set these in your Stripe Dashboard)
export const STRIPE_PRICE_IDS = {
  premium: {
    monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || 'price_premium_monthly',
    annual: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID || 'price_premium_annual',
  },
  business: {
    monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID || 'price_business_monthly',
    annual: process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID || 'price_business_annual',
  },
};

/**
 * Create Stripe checkout session
 */
export async function createCheckoutSession(params: {
  priceId: string;
  customerId?: string;
  customerEmail: string;
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}): Promise<StripeCheckoutSession | null> {
  if (!stripe) {
    console.warn('Stripe not configured - running in DEMO mode');
    return null;
  }

  try {
    // Uncomment when Stripe is installed:
    // const session = await stripe.checkout.sessions.create({
    //   mode: 'subscription',
    //   payment_method_types: ['card'],
    //   line_items: [
    //     {
    //       price: params.priceId,
    //       quantity: 1,
    //     },
    //   ],
    //   customer: params.customerId,
    //   customer_email: params.customerId ? undefined : params.customerEmail,
    //   metadata: params.metadata,
    //   success_url: params.successUrl,
    //   cancel_url: params.cancelUrl,
    //   allow_promotion_codes: true,
    // });
    // return session;
    
    return null;
  } catch (error) {
    console.error('Failed to create Stripe checkout session:', error);
    throw error;
  }
}

/**
 * Create Stripe customer
 */
export async function createStripeCustomer(email: string, name?: string): Promise<string | null> {
  if (!stripe) {
    console.warn('Stripe not configured - running in DEMO mode');
    return null;
  }

  try {
    // Uncomment when Stripe is installed:
    // const customer = await stripe.customers.create({
    //   email,
    //   name,
    // });
    // return customer.id;
    
    return null;
  } catch (error) {
    console.error('Failed to create Stripe customer:', error);
    throw error;
  }
}

/**
 * Cancel Stripe subscription
 */
export async function cancelStripeSubscription(subscriptionId: string): Promise<boolean> {
  if (!stripe) {
    console.warn('Stripe not configured - running in DEMO mode');
    return true;
  }

  try {
    // Uncomment when Stripe is installed:
    // await stripe.subscriptions.cancel(subscriptionId);
    return true;
  } catch (error) {
    console.error('Failed to cancel Stripe subscription:', error);
    return false;
  }
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): StripeEvent | null {
  if (!stripe) {
    console.warn('Stripe not configured - webhook verification skipped');
    return null;
  }

  try {
    // Uncomment when Stripe is installed:
    // return stripe.webhooks.constructEvent(payload, signature, secret);
    return null;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return null;
  }
}

export default stripe;
