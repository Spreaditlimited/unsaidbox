import { InputError } from "./security.mjs";

export const billingEvents = Object.freeze([
  "checkout.session.completed", "checkout.session.async_payment_succeeded",
  "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted",
  "invoice.paid", "invoice.payment_failed", "invoice.payment_action_required",
]);

export function billingEnvironment(env = process.env) {
  const mode = env.UNSAID_BILLING_MODE || "disabled";
  if (!['test', 'live'].includes(mode)) throw new InputError("Payments are not enabled yet.");
  if (mode === 'test' && env.VERCEL_ENV === "production") throw new InputError("Sandbox payments cannot run on the production website.");
  if (mode === 'live' && (env.VERCEL_ENV !== 'production' || env.UNSAIDBOX_APP_URL !== 'https://unsaidbox.com')) throw new InputError('Live payments require the production website.');
  const key = (mode === 'live' ? env.UNSAID_STRIPE_SECRET_KEY : env.UNSAID_STRIPE_TEST_SECRET_KEY) || '';
  if (!new RegExp(`^(sk|rk)_${mode}_[A-Za-z0-9]+$`).test(key)) throw new InputError("Billing credentials are not configured for this environment.");
  return { mode, key };
}
export function billingWebhookSecret(env = process.env) {
  return env.UNSAID_BILLING_MODE === 'live' ? env.UNSAID_STRIPE_WEBHOOK_SECRET : env.UNSAID_STRIPE_TEST_WEBHOOK_SECRET;
}

export function stripeReference(value) {
  return typeof value === "string" ? value : value?.id;
}

export function logBillingFailure(error, operation, log = console.error) {
  const safe = value => typeof value === 'string' && /^[A-Za-z0-9_.-]{1,80}$/.test(value) ? value : undefined;
  try {
    log('billing_request_failed', {
      operation: ['checkout', 'portal', 'refresh'].includes(operation) ? operation : 'unknown',
      type: safe(error?.type), code: safe(error?.code), param: safe(error?.param),
      status: Number.isInteger(error?.statusCode) ? error.statusCode : undefined,
      requestId: typeof error?.requestId === 'string' && /^req_[A-Za-z0-9]{1,80}$/.test(error.requestId) ? error.requestId : undefined,
    });
  } catch { /* Diagnostics must not replace the original failure. */ }
}

export function assertCheckoutPrice(price, mapping, amount, mode = 'test') {
  const product = price.product;
  if (price.livemode !== (mode === 'live') || !price.active || price.type !== "recurring" ||
      price.unit_amount !== amount || mapping.amount !== amount || price.currency !== mapping.currency ||
      price.recurring?.interval !== mapping.interval || price.recurring?.interval_count !== 1 ||
      price.recurring?.usage_type !== "licensed" || price.billing_scheme !== "per_unit" ||
      stripeReference(product) !== mapping.stripeProductId || !product || typeof product === "string" || product.deleted || !product.active ||
      price.id !== mapping.stripePriceId || mapping.mode !== mode) {
    throw new InputError("This price is not ready for checkout. Please refresh or contact support.");
  }
}

export function hasPaidPro(subscription, now = new Date()) {
  return Boolean(subscription?.recognized && ["active", "past_due"].includes(subscription.status) &&
    subscription.paidThrough && new Date(subscription.paidThrough) > now);
}

export function stripeRedirect(value, kind) {
  const url = new URL(value || "");
  const host = kind === "checkout" ? "checkout.stripe.com" : "billing.stripe.com";
  if (url.protocol !== "https:" || url.hostname !== host || url.username || url.password || url.port) throw new Error("BILLING_REDIRECT");
  return url.href;
}
