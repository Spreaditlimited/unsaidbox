import "server-only";
import Stripe from "stripe";
import { billingEnvironment } from "./billing-runtime.mjs";

export function stripeClient() {
  const { key } = billingEnvironment();
  return new Stripe(key, { timeout: 10000, maxNetworkRetries: 0 });
}
