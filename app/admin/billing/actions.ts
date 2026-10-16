"use server";
import { unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdministrator } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyCaptcha } from "@/lib/captcha.mjs";
import { InputError } from "@/lib/security.mjs";
import { parsePricing, pricingRevision, parseTaxSettings, taxRevision } from "@/lib/billing-policy.mjs";
import type { Result } from "@/app/actions";

export async function saveBillingPricing(_: Result, form: FormData): Promise<Result> {
  try {
    const admin = await requireAdministrator();
    await verifyCaptcha(form, "saveBillingPricing");
    await rateLimit(`billing-pricing:${admin.id}`, 10, 900);
    const prices = parsePricing(form);
    const revision = pricingRevision(form.get("revision"));
    await db().$transaction(async tx => {
      const changed = await tx.billingConfiguration.updateMany({
        where: { id: "pricing", revision },
        data: { prices, revision: { increment: 1 }, updatedBy: admin.id },
      });
      if (changed.count !== 1) throw new InputError("Pricing changed in another tab or is not installed. Reload this page before saving.");
      await tx.auditEvent.create({ data: { actorId: admin.id, targetId: "pricing", action: `billing:pricing_revision_${revision + 1}` } });
    });
    revalidatePath("/admin/billing");
    revalidatePath("/pricing");
    revalidatePath("/dashboard/billing");
    return { success: "Pricing saved. Checkout is not enabled, and existing subscriptions have not been changed." };
  } catch (error) {
    unstable_rethrow(error);
    return { error: error instanceof InputError ? error.message : "Pricing could not be saved. Check database setup and try again." };
  }
}

export async function saveBillingTax(_: Result, form: FormData): Promise<Result> {
  try {
    const admin = await requireAdministrator();
    await verifyCaptcha(form, 'saveBillingTax');
    await rateLimit(`billing-tax:${admin.id}`, 10, 900);
    const settings = parseTaxSettings(form);
    const revision = taxRevision(form.get('revision'));
    if (settings.enabled && form.get('confirmScope') !== 'on') throw new InputError('Confirm that this fixed rate is appropriate for all new checkouts before enabling VAT.');
    await db().$transaction(async tx => {
      if (revision === 0) {
        await tx.billingConfiguration.create({ data: { id: 'vat', prices: settings, revision: 1, updatedBy: admin.id } });
      } else {
        const result = await tx.billingConfiguration.updateMany({ where: { id: 'vat', revision }, data: { prices: settings, revision: { increment: 1 }, updatedBy: admin.id } });
        if (result.count !== 1) throw new InputError('VAT settings changed in another tab. Reload before saving.');
      }
      await tx.auditEvent.create({ data: { actorId: admin.id, targetId: 'vat', action: `billing:vat_${settings.enabled ? settings.basisPoints : 'off'}_revision_${revision + 1}` } });
    });
    for (const path of ['/admin/billing', '/dashboard/billing', '/pricing']) revalidatePath(path);
    return { success: `VAT ${settings.enabled ? `enabled at ${settings.basisPoints / 100}%` : 'disabled'} for new checkouts. Existing subscriptions are unchanged. Live payments remain disabled.` };
  } catch (error) {
    unstable_rethrow(error);
    return { error: error instanceof InputError ? error.message : 'VAT could not be saved. Reload the page and try again.' };
  }
}
