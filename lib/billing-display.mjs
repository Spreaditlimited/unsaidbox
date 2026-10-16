// Browser-safe display only. Never import database/security/provider modules here.
export function checkoutSummary(prices, currency, interval, tax = { enabled: false, basisPoints: 0 }) {
  const prefix = currency === 'USD' ? 'usd' : 'gbp';
  const yearly = interval === 'year';
  const key = `${prefix}${yearly ? 'Annual' : 'Monthly'}`;
  const format = amount => new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-US', { style: 'currency', currency }).format(amount / 100);
  const saving = yearly ? Math.max(0, prices[`${prefix}Monthly`] * 12 - prices[key]) : 0;
  const taxAmount = tax.enabled ? Math.round(prices[key] * tax.basisPoints / 10000) : 0;
  return {
    key, amount: format(prices[key]), cadence: yearly ? 'per year' : 'per month',
    renewal: yearly ? 'Billed once a year' : 'Billed monthly',
    saving: saving > 0 ? `${format(saving)} less than 12 monthly payments` : null,
    total: format(prices[key] + taxAmount),
    taxNote: tax.enabled ? `${tax.basisPoints / 100}% VAT: ${format(taxAmount)} · Total: ${format(prices[key] + taxAmount)}` : 'VAT is currently switched off.',
  };
}
