import { requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBillingPricing } from "@/lib/billing-pricing";
import { billingEnvironment, billingWebhookSecret } from "@/lib/billing-runtime.mjs";
import { subscriptionPresentation } from "@/lib/billing-presentation.mjs";
import { DashboardShell } from "@/components/DashboardShell";
import { ActionForm } from "@/components/ActionForm";
import { openBillingPortal, refreshBilling } from "./actions";
import { PlanSelector } from "./PlanSelector";
import type { BillingCustomer, BillingSubscription } from "@/generated/prisma";
import styles from "./billing.module.css";
import { accountPlan, usageSummary } from "@/lib/plans";
import { getPlanConfiguration } from '@/lib/plan-configuration';
import { usageMonth } from '@/lib/plan-policy.mjs';
import { ProTools } from "./ProTools";

export const dynamic = "force-dynamic";

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const account = await requireAccount();
  let allowanceConfiguration: Awaited<ReturnType<typeof getPlanConfiguration>> | null = null;
  try { allowanceConfiguration = await getPlanConfiguration(); } catch { /* Show unavailable, not stale limits. */ }
  const plans = allowanceConfiguration?.plans;
  const query = await searchParams;
  let enabled = false;
  let mode = "disabled";
  try { mode = billingEnvironment().mode; enabled = true; } catch { /* Intentionally disabled until configured. */ }
  let setupReady = true;
  let configuration: Awaited<ReturnType<typeof getBillingPricing>> = null;
  let customer: (BillingCustomer & { subscriptions: BillingSubscription[] }) | null = null;
  let availableKeys: string[] = [];
  try {
    configuration = await getBillingPricing();
    if (enabled) {
      customer = await db().billingCustomer.findUnique({ where: { accountId_mode: { accountId: account.id, mode } }, include: { subscriptions: true } });
      const mappings = configuration ? await db().billingPrice.findMany({ where: { mode, catalogRevision: configuration.revision } }) : [];
      availableKeys = mappings.filter(mapping => configuration?.prices[mapping.priceKey] === mapping.amount).map(mapping => mapping.priceKey);
    }
  } catch { setupReady = false; }
  const state = subscriptionPresentation(customer?.subscriptions);
  const current = state.current;
  const canCheckout = Boolean(enabled && setupReady && configuration && !current && availableKeys.length && billingWebhookSecret());
  let featuresReady = true;
  let usage: Awaited<ReturnType<typeof usageSummary>> = null;
  let brand: { name: string; accent: string; hideAttribution: boolean; hasLogo: boolean } | null = null;
  let proTools = false;
  try {
    usage = await usageSummary(account.id);
    const plan = await accountPlan(account.id);
    proTools = plan.enforced && plan.limits.branding;
    if (proTools) {
      const saved = await db().brandSettings.findUnique({ where: { accountId: account.id } });
      brand = saved ? { name: saved.name, accent: saved.accent, hideAttribution: saved.hideAttribution, hasLogo: Boolean(saved.logo) } : null;
    }
  } catch { featuresReady = false; proTools = false; }
  return <DashboardShell accountId={account.id} name={account.displayName} section="billing">
    <div className={styles.page}>
    <header className={`app-heading workspace-heading ${styles.heading}`}><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Plan & billing</h1><p>Your plan, payment details and invoices. All in one place.</p></div></header>
    {mode !== 'live' ? <div className={styles.environmentNote}><span aria-hidden="true">◉</span><p>{enabled ? 'Sandbox workspace' : 'Billing preview'}<span>{enabled ? 'Test payments only. No real charges.' : 'Paid upgrades are not enabled yet.'}</span></p></div> : null}
    <section className={`panel ${styles.summary}`} aria-labelledby="billing-status">
      <div className={styles.summaryHeading}><div><p className="eyebrow">{mode === 'test' ? 'SANDBOX PLAN' : 'CURRENT PLAN'}</p><h2 id="billing-status">{!setupReady ? "Status unavailable" : state.label}</h2><p className={styles.statusDetail}>{setupReady ? state.detail : 'Please try again shortly.'}</p></div>
      <dl className={styles.planFacts}><div><dt>{current?.cancelAtPeriodEnd ? 'Scheduled end' : 'Billing period ends'}</dt><dd>{current?.periodEnd ? current.periodEnd.toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</dd></div><div><dt>Payment provider</dt><dd>{customer?.stripeCustomerId ? (mode === 'test' ? 'Stripe · sandbox' : 'Stripe') : 'Not connected'}</dd></div></dl>
      </div>
      {!setupReady && <p className="notice" role="status">We could not load billing data. No new payment can be started. Try again after database setup or connectivity is restored.</p>}
      {query.checkout === "returned" && <p className="notice" role="status">You returned from checkout. Payment is confirmed only after Stripe verification. If the status has not updated, use Refresh billing status.</p>}
      {query.checkout === "cancelled" && <p className="notice">You left checkout. No plan change is assumed.</p>}
      {current && <p className="fine">Stripe status: {current.status.replaceAll("_", " ")}. {current.cancelAtPeriodEnd ? "Cancellation is scheduled at the end of the billing period." : ""} {current.paidThrough ? `Verified paid access through ${current.paidThrough.toLocaleDateString("en-GB", { timeZone: "UTC" })}.` : "No paid period has been verified yet."}</p>}
    </section>
    {!featuresReady ? <p className="notice" role="status">Plan features need the latest database tables or a restored connection. No paid tools have been enabled.</p> : null}
    {usage && plans ? <section className={`panel ${styles.management}`} aria-labelledby="usage-title"><h2 id="usage-title">Monthly responses</h2>
      <p>{usage.used.toLocaleString()} of {usage.limit.toLocaleString()} responses used · {usage.plan === 'pro' ? 'Pro' : 'Free'} plan</p>
      <progress aria-label="Monthly response allowance" max={usage.limit} value={Math.min(usage.used, usage.limit)} style={{ width: '100%', accentColor: 'var(--indigo)' }} />
      <div className={styles.usageDetails}>
        <div className={styles.usageIncluded}><h3>What counts toward usage?</h3><ul><li>Inbox messages</li><li>Question answers</li><li>Completed forms</li></ul><p>Deleting responses does not restore your allowance.</p></div>
        <div className={styles.usageReset}><span>Next allowance reset</span><time dateTime={usage.resetsAt.toISOString()}>{usage.resetsAt.toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })}</time><small>{usage.resetsAt.toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })} UTC · Monthly from your {usage.plan === 'pro' ? 'subscription date' : 'registration date'}</small></div>
      </div>
      {usage.level !== 'normal' ? <p className="notice" role="status">{usage.level === 'full' ? 'Your monthly allowance is full. New submissions are paused until renewal of the monthly allowance or a plan upgrade.' : 'You have used at least 80% of your monthly allowance.'}</p> : null}
      <div className={styles.limitComparison}><table><caption>Active links by plan</caption><thead><tr><th scope="col">Collect responses with</th><th scope="col">Free{usage.plan === 'free' ? <span>Current plan</span> : null}</th><th scope="col">Pro{usage.plan === 'pro' ? <span>Current plan</span> : null}</th></tr></thead><tbody><tr><th scope="row">Questions</th><td>{plans.free.questions}</td><td>{plans.pro.questions}</td></tr><tr><th scope="row">Forms</th><td>{plans.free.forms}</td><td>{plans.pro.forms}</td></tr></tbody></table></div>
      <div className={styles.downgradeNote}><span aria-hidden="true">✓</span><div><h3>Your content stays yours</h3><p>Downgrading never deletes your content. Your oldest active links within the new limit keep accepting responses. Pause an older link to free a slot for another.</p></div></div>
    </section> : null}
    {configuration && plans ? <PlanSelector plans={plans} testMode={mode === 'test'} prices={configuration.prices} tax={configuration.tax} revision={configuration.revision} availableKeys={availableKeys} canCheckout={canCheckout} hasSubscription={Boolean(current)} /> : <p className="notice">Pricing or plan allowances are temporarily unavailable.</p>}
    {proTools && featuresReady ? <ProTools brand={brand} month={usageMonth().key} /> : <section className={`panel ${styles.management}`}><h2>Pro workspace tools</h2><p>Custom share-card branding and consent-aware CSV exports become available after a Pro payment is verified for your account.</p></section>}
    {enabled && customer?.stripeCustomerId && <section className={`panel ${styles.management}`}><div className={styles.sectionHeading}><h2>Manage your subscription</h2><p>Invoices, payment details and cancellation. Your messages stay yours.</p></div>
      <div className={styles.manageGrid}>
        <div className={styles.manageCard}><h3>Payment details & invoices</h3><ActionForm action={openBillingPortal} label="Manage billing" captchaAction="openBillingPortal"><p className="fine">View invoices, update payment details or cancel through Stripe’s secure portal.</p></ActionForm></div>
        <div className={styles.manageCard}><h3>Keep your status up to date</h3><ActionForm action={refreshBilling} label="Refresh billing status" captchaAction="refreshBilling"><p className="fine">Finished checkout? Check your latest subscription status directly with Stripe.</p></ActionForm></div>
      </div>
    </section>}
    </div>
  </DashboardShell>;
}
