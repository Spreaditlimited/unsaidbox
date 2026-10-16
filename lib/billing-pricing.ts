import "server-only";
import { db } from "./db";
import { validateStoredPricing, validateTaxSettings } from "./billing-policy.mjs";

export async function getBillingPricing() {
  const row = await db().billingConfiguration.findUnique({ where: { id: "pricing" } });
  // Fail closed: never silently charge defaults when configuration is missing.
  if (!row) return null;
  return { revision: row.revision, prices: validateStoredPricing(row.prices), updatedAt: row.updatedAt, tax: await getBillingTax() };
}

export async function getBillingTax() {
  const row = await db().billingConfiguration.findUnique({ where: { id: 'vat' } });
  return row ? { ...validateTaxSettings(row.prices), revision: row.revision } : { enabled: false, basisPoints: 2000, revision: 0 };
}
