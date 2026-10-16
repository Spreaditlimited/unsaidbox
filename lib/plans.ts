import "server-only";
import { db } from "./db";
import { hasPaidPro } from "./billing-runtime.mjs";
import { planMode, allowancePeriod, usageLevel } from "./plan-policy.mjs";
import { getPlanConfiguration } from './plan-configuration';
import { InputError } from "./security.mjs";
import type { Prisma } from "@/generated/prisma";
import { queueUsageWarning } from './email-queue.mjs';

export async function accountPlan(accountId: string, client: Prisma.TransactionClient = db()) {
  const { plans } = await getPlanConfiguration(client);
  const mode = planMode();
  if (!mode) return { key: 'free' as const, limits: plans.free, enforced: false };
  const customer = await client.billingCustomer.findUnique({ where: { accountId_mode: { accountId, mode } }, include: { subscriptions: true } });
  const subscription = customer?.subscriptions.filter(sub => sub.mode === mode && hasPaidPro(sub)).sort((a, b) => a.id.localeCompare(b.id))[0];
  const pro = Boolean(subscription);
  return { key: pro ? 'pro' as const : 'free' as const, limits: pro ? plans.pro : plans.free, enforced: true, allowanceAnchor: subscription?.allowanceAnchor };
}
async function periodFor(accountId: string, plan: Awaited<ReturnType<typeof accountPlan>>, client: Prisma.TransactionClient) {
  const account = await client.account.findUniqueOrThrow({ where: { id: accountId }, select: { createdAt: true } });
  if (plan.key === 'pro' && !plan.allowanceAnchor) throw new InputError('Refresh billing status to synchronise your subscription allowance dates.');
  const period = allowancePeriod(plan.key === 'pro' ? plan.allowanceAnchor! : account.createdAt);
  return { ...period, key: `${planMode()}:${plan.key}:${period.key}` };
}
async function baselineUsage(client: Prisma.TransactionClient, accountId: string, period: { start: Date; end: Date }) {
  const count = async (start: Date, end: Date) => {
    const createdAt = { gte: start, lt: end };
    return await client.submission.count({ where: { accountId, createdAt } }) + await client.feedbackEntry.count({ where: { form: { accountId }, createdAt } });
  };
  let used = await count(period.start, period.end);
  // Preserve deleted usage from legacy calendar counters conservatively. Exact
  // timestamps of deleted responses were not retained by the previous system.
  const legacy = await client.planUsage.findMany({ where: { accountId, month: { gte: period.start.toISOString().slice(0, 7), lte: new Date(period.end.getTime() - 1).toISOString().slice(0, 7) } } });
  for (const row of legacy) {
    if (!/^\d{4}-\d{2}$/.test(row.month)) continue;
    const start = new Date(`${row.month}-01T00:00:00Z`);
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    used += Math.max(0, row.submissions - await count(start, end));
  }
  return used;
}
export async function requirePlanFeature(accountId: string, feature: 'branding' | 'csv' | 'aiQuestions') {
  const plan = await accountPlan(accountId);
  if (!plan.enforced || !plan.limits[feature]) throw new InputError('This feature requires a verified Pro subscription in the current billing environment.');
  return plan;
}
// All quota-changing paths acquire this lock BEFORE locking a question/form.
// ReadCommitted ensures counts reflect earlier transactions after lock acquisition.
export async function lockPlanOwner(tx: Prisma.TransactionClient, accountId: string) {
  if (!planMode()) return;
  await tx.$queryRaw`SELECT id FROM Account WHERE id = ${accountId} FOR UPDATE`;
}
export async function assertActiveSlot(tx: Prisma.TransactionClient, accountId: string, kind: 'questions' | 'forms', alreadyActive = false) {
  if (alreadyActive || !planMode()) return;
  const plan = await accountPlan(accountId, tx);
  const count = kind === 'questions'
    ? await tx.question.count({ where: { accountId, linkActive: true, acceptingResponses: true } })
    : await tx.feedbackForm.count({ where: { accountId, linkActive: true, acceptingResponses: true, blocked: false } });
  if (count >= plan.limits[kind]) {
    if (kind === 'questions') {
      const toPause = count - plan.limits.questions + 1;
      throw Object.assign(new InputError(`Your ${plan.key} plan allows ${plan.limits.questions} active questions at a time, not per month. You currently have ${count}. To create or reactivate another, pause ${toPause} existing ${toPause === 1 ? 'question' : 'questions'}: open each question, uncheck “Accept new answers”, then click “Save question”. Existing answers stay saved.`), { upgradeAvailable: plan.key === 'free' });
    }
    throw new InputError(`Your ${plan.key} plan allows ${plan.limits[kind]} active ${kind}. Pause one before opening another, or upgrade your plan.`);
  }
}
export async function consumeSubmission(tx: Prisma.TransactionClient, accountId: string, questionId?: string, formId?: string) {
  if (!planMode()) return;
  const plan = await accountPlan(accountId, tx);
  // On downgrade, preserve all links/data but accept on only the oldest eligible
  // links within the new limit. Owners can pause old links to free capacity.
  if (questionId) {
    const active = await tx.question.findMany({ where: { accountId, linkActive: true, acceptingResponses: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: plan.limits.questions, select: { id: true } });
    if (!active.some(item => item.id === questionId)) throw new InputError('This link is temporarily not accepting responses. Please contact its owner.');
  }
  if (formId) {
    const active = await tx.feedbackForm.findMany({ where: { accountId, linkActive: true, acceptingResponses: true, blocked: false }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: plan.limits.forms, select: { id: true } });
    if (!active.some(item => item.id === formId)) throw new InputError('This link is temporarily not accepting responses. Please contact its owner.');
  }
  const month = await periodFor(accountId, plan, tx);
  let row = await tx.planUsage.findUnique({ where: { accountId_month: { accountId, month: month.key } } });
  if (!row) {
    row = await tx.planUsage.create({ data: { accountId, month: month.key, submissions: await baselineUsage(tx, accountId, month) } });
  }
  if (row.submissions >= plan.limits.submissions) throw new InputError('This inbox has reached its monthly response allowance. Your response has not been saved. Please contact the owner.');
  await tx.planUsage.update({ where: { accountId_month: { accountId, month: month.key } }, data: { submissions: { increment: 1 } } });
  const threshold = Math.ceil(plan.limits.submissions * .8);
  if (row.submissions < threshold && row.submissions + 1 >= threshold) {
    await queueUsageWarning(tx, accountId, month.key, plan.key);
  }
}
export async function usageSummary(accountId: string) {
  const plan = await accountPlan(accountId);
  if (!plan.enforced) return null;
  const month = await periodFor(accountId, plan, db());
  const row = await db().planUsage.findUnique({ where: { accountId_month: { accountId, month: month.key } } });
  const used = row?.submissions ?? await baselineUsage(db(), accountId, month);
  return { used, limit: plan.limits.submissions, level: usageLevel(used, plan.limits.submissions), resetsAt: month.end, plan: plan.key };
}
