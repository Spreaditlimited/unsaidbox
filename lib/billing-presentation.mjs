import { hasPaidPro } from './billing-runtime.mjs';
export { checkoutSummary } from './billing-display.mjs';

export function subscriptionPresentation(subscriptions = [], now = new Date()) {
  const current = [...subscriptions].filter(sub => !['canceled', 'incomplete_expired'].includes(sub.status))
    .sort((a, b) => new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime())[0];
  if (!current) return { current: null, label: 'Free', detail: 'No paid subscription', tone: 'neutral', pro: false };
  const pro = hasPaidPro(current, now);
  if (current.status === 'past_due') return { current, pro, label: 'Payment overdue', detail: 'Update your payment method in Manage billing.', tone: 'warning' };
  if (pro) return { current, pro, label: 'Pro', detail: current.cancelAtPeriodEnd ? 'Cancellation scheduled' : 'Payment verified', tone: 'success' };
  if (current.status === 'incomplete') return { current, pro, label: 'Payment pending', detail: 'Complete or review your payment with Stripe.', tone: 'warning' };
  return { current, pro, label: 'Needs attention', detail: 'Refresh your status or review your subscription with Stripe.', tone: 'warning' };
}
