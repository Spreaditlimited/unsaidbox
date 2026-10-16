'use server';
import { unstable_rethrow } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdministrator } from '@/lib/admin-auth';
import { rateLimit } from '@/lib/auth';
import { db } from '@/lib/db';
import { verifyCaptcha } from '@/lib/captcha.mjs';
import { InputError } from '@/lib/security.mjs';
import { parseAllowances } from '@/lib/allowance-policy.mjs';
import { taxRevision } from '@/lib/billing-policy.mjs';
import type { Result } from '@/app/actions';

export async function savePlanAllowances(_: Result, form: FormData): Promise<Result> {
  try {
    const admin = await requireAdministrator();
    await verifyCaptcha(form, 'savePlanAllowances');
    await rateLimit(`plan-allowances:${admin.id}`, 10, 900);
    const limits = parseAllowances(form);
    const revision = taxRevision(form.get('revision'));
    if (form.get('confirmImpact') !== 'on') throw new InputError('Confirm that these allowances apply to existing and new accounts.');
    await db().$transaction(async tx => {
      if (revision === 0) {
        await tx.billingConfiguration.create({ data: { id: 'allowances', prices: limits, revision: 1, updatedBy: admin.id } });
      } else {
        const changed = await tx.billingConfiguration.updateMany({ where: { id: 'allowances', revision }, data: { prices: limits, revision: { increment: 1 }, updatedBy: admin.id } });
        if (changed.count !== 1) throw new InputError('Allowances changed in another tab. Reload before saving.');
      }
      await tx.auditEvent.create({ data: { actorId: admin.id, targetId: 'allowances', action: `plans:allowances_revision_${revision + 1}` } });
    });
    revalidatePath('/admin/billing');
    revalidatePath('/pricing');
    revalidatePath('/dashboard', 'layout');
    return { success: 'Allowances saved for Free and Pro. Existing usage, reset dates, content and subscription prices are unchanged.' };
  } catch (error) {
    unstable_rethrow(error);
    return { error: error instanceof InputError ? error.message : 'Allowances could not be saved. Reload the page and try again.' };
  }
}
