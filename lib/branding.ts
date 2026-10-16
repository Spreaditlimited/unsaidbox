import "server-only";
import { db } from './db';
import { accountPlan } from './plans';

export async function shareBrand(accountId: string) {
  const plan = await accountPlan(accountId);
  if (!plan.enforced || !plan.limits.branding) return null;
  const row = await db().brandSettings.findUnique({ where: { accountId } });
  // A Pro owner can remove attribution even before saving a custom brand.
  if (!row) return { name: '', accent: '#5850B8', hideAttribution: false, logo: null };
  return { name: row.name, accent: row.accent, hideAttribution: row.hideAttribution,
    logo: row.logo ? `data:image/webp;base64,${Buffer.from(row.logo).toString('base64')}` : null };
}
