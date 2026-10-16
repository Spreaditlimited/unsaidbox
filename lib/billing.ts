import "server-only";
import type Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { Prisma, type BillingCustomer } from "@/generated/prisma";
import { stripeClient } from "./stripe";
import { digest, InputError } from "./security.mjs";
import { appOrigin } from "./email-config.mjs";
import { getBillingPricing } from "./billing-pricing";
import { assertCheckoutPrice, billingEnvironment, stripeReference, stripeRedirect, billingEvents, billingWebhookSecret } from "./billing-runtime.mjs";
import { priceFields } from "./billing-policy.mjs";

export async function billingCustomer(accountId: string) {
  const { mode } = billingEnvironment();
  return db().billingCustomer.upsert({
    where: { accountId_mode: { accountId, mode } }, update: {},
    create: { id: digest(`billing:${mode}:${accountId}`), accountId, mode },
  });
}

async function withBillingLock<T>(id: string, work: (customer: BillingCustomer, token: string) => Promise<T>): Promise<T> {
  const token = randomUUID();
  const locked = await db().billingCustomer.updateMany({ where: { id, OR: [{ lockUntil: null }, { lockUntil: { lt: new Date() } }] }, data: { lockToken: token, lockUntil: new Date(Date.now() + 120000) } });
  if (!locked.count) throw new InputError("A billing update is in progress. Please try again shortly.");
  try { return await work(await db().billingCustomer.findUniqueOrThrow({ where: { id } }), token); }
  finally { await db().billingCustomer.updateMany({ where: { id, lockToken: token }, data: { lockToken: null, lockUntil: null } }); }
}

async function saveLocked(id: string, token: string, data: Prisma.BillingCustomerUpdateManyMutationInput) {
  const saved = await db().billingCustomer.updateMany({ where: { id, lockToken: token, lockUntil: { gt: new Date() } }, data });
  if (!saved.count) throw new Error("BILLING_LOCK_LOST");
}

async function checkoutTaxRate(stripe: Stripe, tax: { enabled: boolean; basisPoints: number; revision: number }) {
  if (!tax.enabled) return null;
  const { mode } = billingEnvironment();
  const matches = (rate: Stripe.TaxRate) => rate.livemode === (mode === 'live') && rate.active && !rate.inclusive && rate.percentage === tax.basisPoints / 100 && rate.display_name === 'VAT' && rate.metadata?.app === 'unsaidbox' && rate.metadata?.vatRevision === String(tax.revision);
  let cursor: string | undefined;
  for (let page = 0; page < 20; page++) {
    const rates = await stripe.taxRates.list({ active: true, inclusive: false, limit: 100, ...(cursor ? { starting_after: cursor } : {}) });
    const found = rates.data.find(matches);
    if (found) return found.id;
    if (!rates.has_more) {
      const rate = await stripe.taxRates.create({ display_name: 'VAT', percentage: tax.basisPoints / 100, inclusive: false, tax_type: 'vat', metadata: { app: 'unsaidbox', vatRevision: String(tax.revision) } }, { idempotencyKey: `unsaidbox:${mode}:vat:${tax.revision}:${tax.basisPoints}` });
      if (!matches(rate)) throw new Error('BILLING_TAX_MISMATCH');
      return rate.id;
    }
    cursor = rates.data.at(-1)?.id;
    if (!cursor) break;
  }
  throw new InputError('VAT setup could not be verified. Please contact support.');
}

export async function beginCheckout(account: { id: string; email: string }, priceKey: string, revision: number, requestedTaxRevision = 0) {
  const { mode } = billingEnvironment();
  const config = await getBillingPricing();
  if (!config || revision !== config.revision || !priceFields.some(field => field.key === priceKey)) throw new InputError("Pricing changed. Reload the billing page before continuing.");
  const tax = config.tax;
  if (requestedTaxRevision !== tax.revision) throw new InputError('VAT settings changed. Reload the billing page before continuing.');
  if (!billingWebhookSecret(process.env)?.startsWith("whsec_")) throw new InputError("Billing verification is not configured yet.");
  const binding = await billingCustomer(account.id);
  return withBillingLock(binding.id, async (customer, lock) => {
    const stripe = stripeClient();
    const mapping = await db().billingPrice.findUnique({ where: { mode_catalogRevision_priceKey: { mode, catalogRevision: revision, priceKey } } });
    if (!mapping) throw new InputError("This price is awaiting Stripe setup.");
    const price = await stripe.prices.retrieve(mapping.stripePriceId, { expand: ["product"] });
    assertCheckoutPrice(price, mapping, config.prices[priceKey], mode);
    if (tax.enabled && price.tax_behavior === 'inclusive') throw new InputError('This Stripe price is tax-inclusive. Configure a compatible price before adding VAT.');
    let stripeCustomerId = customer.stripeCustomerId;
    if (!stripeCustomerId) {
      const created = await stripe.customers.create({ email: account.email, metadata: { unsaidbox_binding: customer.id } }, { idempotencyKey: `customer:${customer.id}` });
      if (created.livemode !== (mode === 'live')) throw new Error("BILLING_MODE_MISMATCH");
      stripeCustomerId = created.id;
      await saveLocked(customer.id, lock, { stripeCustomerId });
    }
    const subscriptions = await stripe.subscriptions.list({ customer: stripeCustomerId, status: "all", limit: 100 });
    if (subscriptions.has_more || subscriptions.data.some(sub => !["canceled", "incomplete_expired"].includes(sub.status))) throw new InputError("You already have a subscription or payment in progress. Use Manage billing instead.");

    let session: Stripe.Checkout.Session | null = null;
    if (customer.checkoutSessionId) session = await stripe.checkout.sessions.retrieve(customer.checkoutSessionId);
    // Recover an ambiguous network failure with the exact same parameters and key.
    if (!session && customer.checkoutKey && customer.checkoutParams) {
      if (!customer.checkoutStartedAt || Date.now() - customer.checkoutStartedAt.getTime() > 23 * 3600000) throw new InputError("A previous checkout needs reconciliation. Contact support before starting another payment.");
      try {
        session = await stripe.checkout.sessions.create(customer.checkoutParams as unknown as Stripe.Checkout.SessionCreateParams, { idempotencyKey: customer.checkoutKey });
      } catch (error) {
        const rejected = error as { type?: string; statusCode?: number; param?: string; message?: string };
        const expiryRejected = rejected.param === 'expires_at' ||
          (rejected.param == null && rejected.message === 'The `expires_at` timestamp must be at least 30 minutes from Checkout Session creation.');
        // Only an explicit parameter rejection proves this attempt was not created.
        // Network failures, permission errors and ambiguous outcomes retain the key.
        if (rejected.type !== 'StripeInvalidRequestError' || rejected.statusCode !== 400 || !expiryRejected ||
            typeof (customer.checkoutParams as Record<string, unknown>).expires_at !== 'number') throw error;
        await saveLocked(customer.id, lock, { checkoutKey: null, checkoutParams: Prisma.DbNull, checkoutStartedAt: null, checkoutSessionId: null });
      }
      if (session) {
        if (session.livemode !== (mode === 'live') || stripeReference(session.customer) !== stripeCustomerId) throw new Error("BILLING_BINDING_MISMATCH");
        await saveLocked(customer.id, lock, { checkoutSessionId: session.id });
      }
    }
    if (session && (session.livemode !== (mode === 'live') || stripeReference(session.customer) !== stripeCustomerId)) throw new Error("BILLING_BINDING_MISMATCH");
    if (session?.status === "complete") {
      const previousSubscription = stripeReference(session.subscription);
      const ended = subscriptions.data.some(sub => sub.id === previousSubscription && ["canceled", "incomplete_expired"].includes(sub.status));
      if (!ended) throw new InputError("Your payment is being verified. Refresh your billing status shortly.");
      // A completed checkout for an ended subscription must not prevent rejoining.
    }
    const latestConfig = await getBillingPricing();
    if (!latestConfig || latestConfig.revision !== revision || latestConfig.tax.revision !== tax.revision) throw new InputError("Pricing or VAT changed. Reload the billing page before continuing.");
    if (session?.status === "open") {
      if (session.metadata?.catalogRevision === String(revision) && session.metadata?.priceKey === priceKey && (session.metadata?.vatRevision ?? '0') === String(tax.revision)) return stripeRedirect(session.url, "checkout");
      await stripe.checkout.sessions.expire(session.id);
    }
    const origin = appOrigin();
    const taxRate = await checkoutTaxRate(stripe, tax);
    const finalConfig = await getBillingPricing();
    if (!finalConfig || finalConfig.revision !== revision || finalConfig.tax.revision !== tax.revision) throw new InputError('Pricing or VAT changed. Reload before continuing.');
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription", customer: stripeCustomerId, client_reference_id: account.id,
      line_items: [{ price: mapping.stripePriceId, quantity: 1, ...(taxRate ? { tax_rates: [taxRate] } : {}) }], allowed_payment_method_types: ["card"],
      adaptive_pricing: { enabled: false },
      success_url: `${origin}/dashboard/billing?checkout=returned`, cancel_url: `${origin}/dashboard/billing?checkout=cancelled`,
      // Stripe sets expiry at creation; an absolute timestamp goes stale on retries.
      automatic_tax: { enabled: false }, allow_promotion_codes: false,
      metadata: { catalogRevision: String(revision), vatRevision: String(tax.revision), priceKey, unsaidbox_binding: customer.id },
      subscription_data: { metadata: { unsaidbox_binding: customer.id } },
    };
    const key = randomUUID();
    await saveLocked(customer.id, lock, { checkoutKey: key, checkoutParams: params as unknown as Prisma.InputJsonValue, checkoutStartedAt: new Date(), checkoutSessionId: null });
    const created = await stripe.checkout.sessions.create(params, { idempotencyKey: key });
    if (created.livemode !== (mode === 'live') || stripeReference(created.customer) !== stripeCustomerId) throw new Error("BILLING_BINDING_MISMATCH");
    await saveLocked(customer.id, lock, { checkoutSessionId: created.id });
    return stripeRedirect(created.url, "checkout");
  });
}

export async function beginPortal(accountId: string) {
  const { mode } = billingEnvironment();
  const customer = await db().billingCustomer.findUnique({ where: { accountId_mode: { accountId, mode } } });
  if (!customer?.stripeCustomerId) throw new InputError("There is no billing customer for this account yet.");
  const stripe = stripeClient();
  const configurations = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  const configuration = configurations.data.find(item => item.metadata?.app === "unsaidbox");
  if (!configuration) throw new InputError("The billing portal needs setup. Contact support.");
  const session = await stripe.billingPortal.sessions.create({ customer: customer.stripeCustomerId, configuration: configuration.id, return_url: `${appOrigin()}/dashboard/billing` });
  return stripeRedirect(session.url, "portal");
}

export async function syncSubscription(customerId: string, subscriptionId: string, event?: { id: string; type: string; created?: number }) {
  const { mode } = billingEnvironment();
  return withBillingLock(customerId, async (customer, lock) => {
    const eventId = event ? `${mode}:${event.id}` : null;
    if (eventId && await db().billingEvent.findUnique({ where: { id: eventId } })) return;
    // Retrieve current provider state under the customer lock. Never replay a stale snapshot.
    const sub = await stripeClient().subscriptions.retrieve(subscriptionId, { expand: ["latest_invoice"] });
    if (sub.livemode !== (mode === 'live') || stripeReference(sub.customer) !== customer.stripeCustomerId || customer.mode !== mode) throw new Error("BILLING_BINDING_MISMATCH");
    const item = sub.items.data[0];
    const price = item?.price;
    const mapping = price ? await db().billingPrice.findUnique({ where: { mode_stripePriceId: { mode, stripePriceId: price.id } } }) : null;
    const recognized = Boolean(mapping && sub.items.data.length === 1 && !sub.items.has_more && item.quantity === 1 &&
      price.unit_amount === mapping.amount && price.currency === mapping.currency && stripeReference(price.product) === mapping.stripeProductId &&
      price.recurring?.interval === mapping.interval && price.recurring?.interval_count === 1);
    const periodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000) : null;
    const invoice = sub.latest_invoice;
    const paid = invoice && typeof invoice !== "string" && invoice.status === "paid";
    const id = `${mode}:${sub.id}`;
    await db().$transaction(async tx => {
      const checked = await tx.billingCustomer.updateMany({ where: { id: customer.id, lockToken: lock, lockUntil: { gt: new Date() } }, data: { updatedAt: new Date() } });
      if (!checked.count) throw new Error("BILLING_LOCK_LOST");
      const previous = await tx.billingSubscription.findUnique({ where: { id } });
      if (previous && previous.customerId !== customer.id) throw new Error("BILLING_BINDING_MISMATCH");
      const data = { customerId: customer.id, mode, stripePriceId: price?.id || "unknown", status: sub.status, recognized,
        cancelAtPeriodEnd: sub.cancel_at_period_end, periodEnd,
        allowanceAnchor: sub.billing_cycle_anchor ? new Date(sub.billing_cycle_anchor * 1000) : previous?.allowanceAnchor ?? null,
        paidThrough: recognized && paid && sub.status === "active" ? periodEnd : previous?.paidThrough ?? null, syncedAt: new Date() };
      await tx.billingSubscription.upsert({ where: { id }, create: { id, ...data }, update: data });
      if (event) await tx.billingHistory.create({ data: {
        customerId: customer.id, mode, provider: 'STRIPE', eventKey: event.id,
        eventType: event.type, objectId: sub.id, subscriptionId: sub.id,
        status: sub.status, currency: price?.currency ?? null,
        occurredAt: event.created ? new Date(event.created * 1000) : data.syncedAt,
        // Current verified state, not a claim about a delayed event's historical state.
        // Do not sum invoice amounts once per subscription event.
        summary: { kind: 'verified_subscription_snapshot', snapshotAt: data.syncedAt.toISOString(),
          recognized, cancelAtPeriodEnd: sub.cancel_at_period_end,
          interval: mapping?.interval ?? null, unitAmount: mapping?.amount ?? null,
          paidThrough: data.paidThrough?.toISOString() ?? null },
      } });
      if (event && eventId) await tx.billingEvent.create({ data: { id: eventId, mode, type: event.type } });
    });
  });
}

export async function handleBillingEvent(event: Stripe.Event) {
  const { mode } = billingEnvironment();
  if (event.livemode !== (mode === 'live') || event.account) throw new Error("BILLING_MODE_MISMATCH");
  if (!billingEvents.includes(event.type)) return;
  const object = event.data.object as unknown as { id: string; customer?: string | { id: string }; subscription?: string | { id: string }; parent?: { subscription_details?: { subscription?: string | { id: string } } } };
  const stripeCustomerId = stripeReference(object.customer);
  if (!stripeCustomerId) return;
  const customer = await db().billingCustomer.findUnique({ where: { mode_stripeCustomerId: { mode, stripeCustomerId } } });
  if (!customer) return; // Other products in this Stripe sandbox are not ours.
  const subscriptionId = event.type.startsWith("customer.subscription.") ? object.id : stripeReference(object.subscription) || stripeReference(object.parent?.subscription_details?.subscription);
  if (subscriptionId) await syncSubscription(customer.id, subscriptionId, { id: event.id, type: event.type, created: event.created });
}
