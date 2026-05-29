import Stripe from 'stripe';
import { env } from '../config/env';

/**
 * Wrapper centralisé pour le SDK Stripe
 */
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10' as any, // Cast pour compatibilité inter-versions et éviter tout conflit TypeScript
  typescript: true,
});
