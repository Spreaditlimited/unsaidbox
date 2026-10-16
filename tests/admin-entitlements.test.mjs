import test from 'node:test';
import assert from 'node:assert/strict';
import { accountPlanWhere, paidSubscriptionWhere } from '../lib/admin-entitlements.mjs';

test('paid directory filtering requires recognized, unexpired paid access in the selected environment', () => {
  const now = new Date('2026-10-09T12:00:00Z');
  assert.deepEqual(paidSubscriptionWhere('live', now), { mode: 'live', recognized: true, status: { in: ['active', 'past_due'] }, paidThrough: { gt: now } });
  const pro = accountPlanWhere('live', 'pro', now);
  assert.deepEqual(accountPlanWhere('live', 'free', now), { NOT: pro });
  assert.deepEqual(accountPlanWhere(null, 'free', now), {});
  assert.deepEqual(accountPlanWhere('live', 'invalid', now), {});
});
