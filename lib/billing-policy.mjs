import { InputError } from "./security.mjs";

// Amounts are always integer minor units. Free is not a zero-price subscription.
export const priceFields = Object.freeze([
  { key: "gbpMonthly", label: "GBP monthly", currency: "GBP", interval: "month", defaultAmount: 900 },
  { key: "gbpAnnual", label: "GBP annual", currency: "GBP", interval: "year", defaultAmount: 9000 },
  { key: "usdMonthly", label: "USD monthly", currency: "USD", interval: "month", defaultAmount: 1200 },
  { key: "usdAnnual", label: "USD annual", currency: "USD", interval: "year", defaultAmount: 12000 },
]);

export function defaultPricing() {
  return Object.fromEntries(priceFields.map(field => [field.key, field.defaultAmount]));
}

export function parseMoney(value, label = "Price") {
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,4})(\.\d{1,2})?$/.test(value.trim())) {
    throw new InputError(`${label}: enter an amount with at most two decimal places, without a currency symbol.`);
  }
  const [whole, fractional = ""] = value.trim().split(".");
  const minor = Number(whole) * 100 + Number(fractional.padEnd(2, "0"));
  if (minor < 50 || minor > 1000000) throw new InputError(`${label}: use an amount between 0.50 and 10,000.00.`);
  return minor;
}

export function parsePricing(form) {
  return Object.fromEntries(priceFields.map(field => [field.key, parseMoney(form.get(field.key), field.label)]));
}

export function validateStoredPricing(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("Pricing configuration is invalid.");
  return Object.fromEntries(priceFields.map(({ key }) => {
    const amount = value[key];
    if (!Number.isSafeInteger(amount) || amount < 50 || amount > 1000000) throw new InputError("Pricing configuration is invalid.");
    return [key, amount];
  }));
}

export function priceInput(minor) {
  return (minor / 100).toFixed(2);
}

export function formatPrice(minor, currency) {
  return new Intl.NumberFormat(currency === "GBP" ? "en-GB" : "en-US", { style: "currency", currency }).format(minor / 100);
}

export function pricingRevision(value) {
  if (typeof value !== "string" || !/^[1-9]\d{0,8}$/.test(value)) throw new InputError("Reload this page before saving pricing.");
  return Number(value);
}

export function validateTaxSettings(value) {
  if (!value || typeof value.enabled !== 'boolean' || !Number.isInteger(value.basisPoints) || value.basisPoints < 0 || value.basisPoints > 10000 || (value.enabled && value.basisPoints === 0)) throw new InputError('VAT configuration is invalid.');
  return { enabled: value.enabled, basisPoints: value.basisPoints };
}
export function taxRevision(value) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,8})$/.test(value)) throw new InputError('Reload the page before saving or checking out.');
  return Number(value);
}
export function parseTaxSettings(form) {
  const enabled = form.get('enabled') === 'on';
  const raw = String(form.get('percentage') ?? '').trim();
  if (!/^(0|[1-9]\d{0,2})(\.\d{1,2})?$/.test(raw)) throw new InputError('Enter a VAT percentage with at most two decimal places.');
  const [whole, decimal = ''] = raw.split('.');
  const basisPoints = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  if (basisPoints > 10000 || (enabled && basisPoints === 0)) throw new InputError('Enabled VAT must be greater than 0% and no more than 100%.');
  return validateTaxSettings({ enabled, basisPoints });
}
