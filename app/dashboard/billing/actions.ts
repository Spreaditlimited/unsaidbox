"use server";
import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAccount, rateLimit } from "@/lib/auth";
import { verifyCaptcha } from "@/lib/captcha.mjs";
import { InputError } from "@/lib/security.mjs";
import { pricingRevision, taxRevision } from "@/lib/billing-policy.mjs";
import { beginCheckout, beginPortal, syncSubscription } from "@/lib/billing";
import { billingEnvironment, logBillingFailure } from "@/lib/billing-runtime.mjs";
import { stripeClient } from "@/lib/stripe";
import { db } from "@/lib/db";
import type { Result } from "@/app/actions";

function failure(error: unknown, operation: string): Result {
  unstable_rethrow(error);
  if (!(error instanceof InputError)) logBillingFailure(error, operation);
  return { error: error instanceof InputError ? error.message : "Billing could not complete that request. Please try again; do not start another payment if one is already processing." };
}

export async function startCheckout(_: Result, form: FormData): Promise<Result> {
  try {
    const account = await requireAccount();
    await verifyCaptcha(form, "startCheckout");
    await rateLimit(`checkout:${account.id}`, 10, 900);
    const key = form.get("priceKey");
    if (typeof key !== "string") throw new InputError("Choose a billing option.");
    const url = await beginCheckout(account, key, pricingRevision(form.get("revision")), taxRevision(form.get('taxRevision')));
    redirect(url);
  } catch (error) { return failure(error, 'checkout'); }
}

export async function openBillingPortal(_: Result, form: FormData): Promise<Result> {
  try {
    const account = await requireAccount();
    await verifyCaptcha(form, "openBillingPortal");
    await rateLimit(`billing-portal:${account.id}`, 10, 900);
    redirect(await beginPortal(account.id));
  } catch (error) { return failure(error, 'portal'); }
}

export async function refreshBilling(_: Result, form: FormData): Promise<Result> {
  try {
    const account = await requireAccount();
    await verifyCaptcha(form, "refreshBilling");
    await rateLimit(`billing-refresh:${account.id}`, 5, 300);
    const { mode } = billingEnvironment();
    const customer = await db().billingCustomer.findUnique({ where: { accountId_mode: { accountId: account.id, mode } } });
    if (!customer?.stripeCustomerId) throw new InputError("There is no subscription to refresh yet.");
    const subscriptions = await stripeClient().subscriptions.list({ customer: customer.stripeCustomerId, status: "all", limit: 100 });
    if (subscriptions.has_more) throw new InputError("Contact support to reconcile this billing account.");
    for (const subscription of subscriptions.data) await syncSubscription(customer.id, subscription.id);
    revalidatePath("/dashboard/billing");
    return { success: "Subscription status checked with Stripe." };
  } catch (error) { return failure(error, 'refresh'); }
}
