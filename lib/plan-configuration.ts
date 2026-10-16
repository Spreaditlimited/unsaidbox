import 'server-only';
import { db } from './db';
import type { Prisma } from '@/generated/prisma';
import { plans } from './plan-policy.mjs';
import { validateAllowances } from './allowance-policy.mjs';

// No cross-request cache: enforcement always reads the saved configuration.
// Missing configuration keeps current allowances; failures never grant more usage.
export async function getPlanConfiguration(client: Prisma.TransactionClient = db()) {
  const row = await client.billingConfiguration.findUnique({ where: { id: 'allowances' } });
  return { plans: row ? validateAllowances(row.prices) : plans, revision: row?.revision ?? 0 };
}
