import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutSummary, subscriptionPresentation } from '../lib/billing-presentation.mjs';
import { defaultPricing } from '../lib/billing-policy.mjs';

test('all currency and billing choices use configured prices and correct keys', () => {
  for (const [currency, interval, key, amount] of [['GBP','month','gbpMonthly','£9.00'], ['GBP','year','gbpAnnual','£90.00'], ['USD','month','usdMonthly','$12.00'], ['USD','year','usdAnnual','$120.00']]) {
    const summary = checkoutSummary(defaultPricing(), currency, interval);
    assert.equal(summary.key, key); assert.equal(summary.amount, amount);
  }
  assert.match(checkoutSummary(defaultPricing(), 'GBP', 'year').saving, /£18.00/);
  assert.equal(checkoutSummary({ ...defaultPricing(), gbpAnnual: 12000 }, 'GBP', 'year').saving, null);
  assert.equal(checkoutSummary({ ...defaultPricing(), gbpMonthly: 1400 }, 'GBP', 'month').amount, '£14.00');
});
test('billing status differentiates pending, overdue, verified and cancelled subscriptions', () => {
  const now = new Date('2026-10-07T12:00:00Z');
  const paid = { recognized: true, status: 'active', syncedAt: now, paidThrough: new Date('2026-11-07'), cancelAtPeriodEnd: false };
  assert.equal(subscriptionPresentation([], now).label, 'Free');
  assert.equal(subscriptionPresentation([paid], now).detail, 'Payment verified');
  assert.equal(subscriptionPresentation([{ ...paid, cancelAtPeriodEnd: true }], now).detail, 'Cancellation scheduled');
  assert.equal(subscriptionPresentation([{ ...paid, status: 'incomplete' }], now).label, 'Payment pending');
  assert.equal(subscriptionPresentation([{ ...paid, status: 'past_due' }], now).label, 'Payment overdue');
  assert.equal(subscriptionPresentation([{ ...paid, status: 'canceled' }], now).label, 'Free');
  assert.equal(subscriptionPresentation([{ ...paid, paidThrough: new Date('2026-10-01') }], now).pro, false);
  assert.equal(subscriptionPresentation([{ ...paid, recognized: false }], now).pro, false);
});
