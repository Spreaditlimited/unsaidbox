import test from 'node:test';
import assert from 'node:assert/strict';
import { billingEnvironment, billingWebhookSecret } from '../lib/billing-runtime.mjs';
import { planMode } from '../lib/plan-policy.mjs';
const live = { UNSAID_BILLING_MODE: 'live', VERCEL_ENV: 'production', UNSAIDBOX_APP_URL: 'https://unsaidbox.com', UNSAID_STRIPE_SECRET_KEY: 'rk_live_fixture', UNSAID_STRIPE_WEBHOOK_SECRET: 'whsec_live_fixture', UNSAID_STRIPE_TEST_WEBHOOK_SECRET: 'whsec_test_fixture' };
test('live requires explicit production and canonical origin, never falls back to test credentials', () => {
  assert.equal(billingEnvironment(live).mode, 'live');
  assert.equal(planMode(live), 'live');
  assert.equal(billingWebhookSecret(live), 'whsec_live_fixture');
  for (const changes of [{ VERCEL_ENV: 'preview' }, { VERCEL_ENV: undefined }, { UNSAIDBOX_APP_URL: 'http://localhost:3001' }, { UNSAID_STRIPE_SECRET_KEY: 'sk_test_fixture' }, { UNSAID_STRIPE_SECRET_KEY: '' }]) assert.throws(() => billingEnvironment({ ...live, ...changes }));
  assert.throws(() => billingEnvironment({ ...live, UNSAID_BILLING_MODE: 'test', UNSAID_STRIPE_TEST_SECRET_KEY: 'sk_test_fixture' }));
});
