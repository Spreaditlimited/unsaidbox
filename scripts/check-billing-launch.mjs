// Read-only: never creates a customer, subscription, payment, price or webhook.
import Stripe from 'stripe';
import { PrismaClient } from '../generated/prisma/index.js';
import { validateDatabaseUrl } from '../lib/database-url.mjs';
import { billingEnvironment, assertCheckoutPrice } from '../lib/billing-runtime.mjs';
import { priceFields, validateStoredPricing } from '../lib/billing-policy.mjs';
let db;
try {
  db = new PrismaClient({ datasources: { db: { url: validateDatabaseUrl(process.env.UNSAIDBOX_DATABASE_URL) } } });
  await db.$transaction(async tx => {
    const identity = await tx.$queryRaw`SELECT DATABASE() AS name, CURRENT_USER() AS account`;
    const tls = await tx.$queryRawUnsafe("SHOW SESSION STATUS LIKE 'Ssl_cipher'");
    if (identity[0]?.name !== 'unsaidbox' || !identity[0]?.account.startsWith('unsaidbox_app@') || !tls[0]?.Value) throw Error('DATABASE_IDENTITY_OR_TLS');
    for (const model of ['billingConfiguration', 'billingCustomer', 'billingPrice', 'billingSubscription', 'billingEvent', 'planUsage', 'brandSettings']) await tx[model].count();
  });
  console.log('PASS: dedicated restricted database, encrypted connection and all seven billing/feature tables.');
  const config = await db.billingConfiguration.findUniqueOrThrow({ where: { id: 'pricing' } });
  const prices = validateStoredPricing(config.prices);
  const { key } = billingEnvironment();
  const stripe = new Stripe(key, { timeout: 10000, maxNetworkRetries: 0 });
  const mappings = await db.billingPrice.findMany({ where: { mode: 'test', catalogRevision: config.revision } });
  for (const field of priceFields) {
    const mapping = mappings.find(item => item.priceKey === field.key);
    if (!mapping) throw Error('MISSING_SANDBOX_PRICE');
    const price = await stripe.prices.retrieve(mapping.stripePriceId, { expand: ['product'] });
    assertCheckoutPrice(price, mapping, prices[field.key]);
  }
  console.log('PASS: all four sandbox prices match the current administrator catalogue and Stripe.');
  console.log(process.env.UNSAID_STRIPE_TEST_WEBHOOK_SECRET?.startsWith('whsec_')
    ? 'CONFIGURED: sandbox webhook secret present. Actual event delivery still needs a payment-flow test.'
    : 'BLOCKED: sandbox webhook signing secret missing.');
} catch (error) {
  console.log('BLOCKED: readiness check could not finish.', { code: error.code || error.errorCode || (/^[A-Z_]+$/.test(error.message || '') ? error.message : 'CHECK_CONFIGURATION') });
} finally {
  await db?.$disconnect();
  console.log('NOT READY FOR LIVE CHARGING: live checkout/entitlement mode is intentionally disabled.');
  console.log('Remaining gates: confirmed tax treatment; live catalogue and signed webhook configuration; successful sandbox checkout/renewal/cancellation tests; production verification and explicit deployment approval.');
  console.log('No data, subscriptions or Stripe settings changed. No credentials printed.');
  // Non-zero deliberately prevents treating sandbox checks as a launch approval.
  process.exitCode = 1;
}
