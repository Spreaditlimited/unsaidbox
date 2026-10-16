// Keep the directory's database predicate aligned with hasPaidPro.
export function paidSubscriptionWhere(mode, now = new Date()) {
  return { mode, recognized: true, status: { in: ['active', 'past_due'] }, paidThrough: { gt: now } };
}

export function accountPlanWhere(mode, plan, now = new Date()) {
  if (!mode || !['free', 'pro'].includes(plan)) return {};
  const paid = { billingCustomers: { some: { mode, subscriptions: { some: paidSubscriptionWhere(mode, now) } } } };
  return plan === 'pro' ? paid : { NOT: paid };
}
