import Stripe from "stripe";
import { PrismaClient } from "../generated/prisma/index.js";
import { validateDatabaseUrl } from "../lib/database-url.mjs";
import { billingEnvironment, assertCheckoutPrice } from "../lib/billing-runtime.mjs";
import { priceFields, validateStoredPricing } from "../lib/billing-policy.mjs";
import { digest } from "../lib/security.mjs";

let db;
try {
  if (!process.argv.includes("--confirm-live")) throw new Error("CONFIRM_LIVE_REQUIRED");
  const { key } = billingEnvironment({ ...process.env, UNSAID_BILLING_MODE: "live", VERCEL_ENV: "production", UNSAIDBOX_APP_URL: "https://unsaidbox.com" });
  const stripe = new Stripe(key, { timeout: 10000, maxNetworkRetries: 1 });
  db = new PrismaClient({ datasources: { db: { url: validateDatabaseUrl(process.env.UNSAIDBOX_DATABASE_URL) } } });
  const config = await db.billingConfiguration.findUniqueOrThrow({ where: { id: "pricing" } });
  const prices = validateStoredPricing(config.prices);
  // Verify the table is installed before making any Stripe writes.
  await db.billingPrice.count();
  const productId = "unsaidbox_pro";
  let product;
  try { product = await stripe.products.retrieve(productId); }
  catch (error) {
    if (error.code !== "resource_missing") throw error;
    product = await stripe.products.create({ id: productId, name: "UnsaidBox Pro", metadata: { app: "unsaidbox" } }, { idempotencyKey: "unsaidbox:live:product:v1" });
  }
  if (product.deleted || !product.livemode || !product.active || product.metadata.app !== "unsaidbox") throw new Error("PRODUCT_MISMATCH");
  for (const field of priceFields) {
    const id = digest(`live:${config.revision}:${field.key}`);
    const existing = await db.billingPrice.findUnique({ where: { id } });
    const lookup = `unsaidbox_live_r${config.revision}_${field.key}`;
    const found = existing ? await stripe.prices.retrieve(existing.stripePriceId, { expand: ["product"] }) : (await stripe.prices.list({ lookup_keys: [lookup], limit: 1, expand: ["data.product"] })).data[0];
    const price = found || await stripe.prices.create({ product: productId, currency: field.currency.toLowerCase(), unit_amount: prices[field.key], recurring: { interval: field.interval }, lookup_key: lookup, metadata: { app: "unsaidbox", catalogRevision: String(config.revision), priceKey: field.key }, expand: ["product"] }, { idempotencyKey: `price:${id}` });
    const mapping = { mode: "live", catalogRevision: config.revision, priceKey: field.key, stripePriceId: price.id, stripeProductId: productId, amount: prices[field.key], currency: field.currency.toLowerCase(), interval: field.interval };
    assertCheckoutPrice(price, mapping, prices[field.key], "live");
    // Do not overwrite price history or race a newer admin catalogue revision.
    await db.$transaction(async tx => {
      const current = await tx.billingConfiguration.findUniqueOrThrow({ where: { id: "pricing" } });
      if (current.revision !== config.revision) throw new Error("CATALOG_CHANGED_RETRY");
      await tx.billingPrice.upsert({ where: { id }, create: { id, ...mapping }, update: {} });
    });
    console.log(`${field.label}: live price verified and linked.`);
  }
  const portal = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  if (!portal.data.some(item => item.metadata?.app === "unsaidbox")) {
    await stripe.billingPortal.configurations.create({
      business_profile: { headline: "Manage your UnsaidBox subscription" },
      features: { customer_update: { enabled: true, allowed_updates: ["email", "address"] }, invoice_history: { enabled: true }, payment_method_update: { enabled: true }, subscription_cancel: { enabled: true, mode: "at_period_end" }, subscription_update: { enabled: false } },
      metadata: { app: "unsaidbox" },
    }, { idempotencyKey: "unsaidbox:live:portal:v1" });
  }
  console.log("Live catalogue and portal configured. No payments created. No customers or payments created. Webhook setup is still required.");
} catch (error) {
  console.error("Live configuration incomplete.", { code: error.code || error.errorCode || (/^[A-Z_]+$/.test(error.message || "") ? error.message : "CHECK_SETUP") });
  console.error("No credentials printed. Safe to rerun: existing catalogue mappings and Stripe lookup keys are reused.");
  process.exitCode = 1;
} finally { await db?.$disconnect(); }
