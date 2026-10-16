import { requireAdministrator } from "@/lib/admin-auth";
import { getBillingPricing } from "@/lib/billing-pricing";
import { defaultPricing, formatPrice, priceFields, priceInput } from "@/lib/billing-policy.mjs";
import { AdminShell } from "@/components/AdminShell";
import { AdminHeading } from "@/components/AdminUI";
import { ActionForm } from "@/components/ActionForm";
import { saveBillingPricing, saveBillingTax } from "./actions";
import { Checkbox } from '@/components/ui/Checkbox';
import { getPlanConfiguration } from '@/lib/plan-configuration';
import { allowanceFields } from '@/lib/allowance-policy.mjs';
import { savePlanAllowances } from './allowance-actions';

export const dynamic = "force-dynamic";

export default async function BillingSettings() {
  const administrator = await requireAdministrator();
  let configuration: Awaited<ReturnType<typeof getBillingPricing>> = null;
  let unavailable = false;
  try { configuration = await getBillingPricing(); } catch { unavailable = true; }
  const prices = configuration?.prices ?? defaultPricing();
  let allowances: Awaited<ReturnType<typeof getPlanConfiguration>> | null = null;
  try { allowances = await getPlanConfiguration(); } catch { /* Do not offer edits with unknown settings. */ }
  return <AdminShell name={administrator.displayName}>
    <AdminHeading eyebrow="PLANS AND PRICING" title="Billing settings" description="Set clear prices for new subscriptions. Keep existing customers on the price they agreed to." />
    <section className="panel dashboard-section">
      <span className="badge">Subscription settings</span>
      <h2>Free stays free. Pro grows with your audience.</h2>
      <p>Manage the catalogue for new subscriptions. Updated prices require matching Stripe prices before customers can check out.</p>
      <p className="fine">VAT is controlled below and added on top of plan prices when enabled. Saving VAT settings does not enable live payments.</p>
    </section>
    <section className="panel dashboard-section">
      <h2>Pro subscription prices</h2>
      <p>Annual amounts are the total billed once per year, not the monthly equivalent. USD prices are denominated in US dollars, including for customers outside the United States who choose USD.</p>
      {configuration ? <ActionForm key={configuration.revision} action={saveBillingPricing} label="Save pricing" captchaAction="saveBillingPricing">
        <input type="hidden" name="revision" value={configuration.revision} />
        <div className="admin-two-column">{priceFields.map(field => <label key={field.key}>{field.label}
          <input name={field.key} defaultValue={priceInput(prices[field.key])} inputMode="decimal" maxLength={8} required autoComplete="off" aria-describedby={`${field.key}-help`} />
          <span id={`${field.key}-help`} className="fine">Current: {formatPrice(prices[field.key], field.currency)} per {field.interval}.</span>
        </label>)}</div>
        <p className="fine">Saving updates the desired catalogue only. It does not edit Stripe Prices, reprice subscribers, collect payments or grant Pro access.</p>
      </ActionForm> : <>
        <p className="notice" role="status">{unavailable ? "Billing configuration is unavailable. Install the billing configuration migration, or check the database connection if it is already installed." : "Install the billing configuration migration to enable price editing."}</p>
        <dl>{priceFields.map(field => <div key={field.key}><dt>{field.label}</dt><dd>{formatPrice(prices[field.key], field.currency)} per {field.interval}</dd></div>)}</dl>
        <p className="fine">Proposed defaults shown above; no fallback prices will be used to charge customers.</p>
      </>}
    </section>
    {configuration ? <section className="panel dashboard-section"><h2>VAT at checkout</h2><p>Set a fixed percentage for new subscriptions. VAT is added on top of the selected plan price in either currency.</p>
      <ActionForm key={`vat-${configuration.tax.revision}`} action={saveBillingTax} label="Save VAT settings" captchaAction="saveBillingTax">
        <input type="hidden" name="revision" value={configuration.tax.revision} />
        <Checkbox name="enabled" defaultChecked={configuration.tax.enabled}>Enable VAT for new checkouts</Checkbox>
        <label>VAT percentage<input name="percentage" inputMode="decimal" defaultValue={String(configuration.tax.basisPoints / 100)} required maxLength={6} aria-describedby="vat-percentage-help" /><span id="vat-percentage-help" className="fine">For example, enter 20 for 20%. Up to two decimal places.</span></label>
        <Checkbox name="confirmScope">I confirm this fixed rate is appropriate for all new checkouts.</Checkbox>
        <p className="notice">This is a manual rate, not automatic international tax calculation. It does not determine tax jurisdiction, VAT registration or exemptions. Existing subscriptions and already-open Stripe checkout pages retain their original tax settings.</p>
        <p className="fine">For a new checkout, the matching Stripe tax rate is created or reused automatically. No manual Stripe rate ID is needed. An API permission failure stops checkout rather than omitting VAT.</p>
      </ActionForm></section> : null}
    <section className="panel dashboard-section" aria-labelledby="allowance-heading">
      <span className="badge">Free & Pro</span><h2 id="allowance-heading">Plan allowances</h2>
      <p>Control how much each plan can collect. One inbox message, question answer or completed form counts as one response.</p>
      {allowances ? <ActionForm key={`allowances-${allowances.revision}`} action={savePlanAllowances} label="Save allowances" captchaAction="savePlanAllowances">
        <input type="hidden" name="revision" value={allowances.revision} />
        <div className="admin-two-column">{(['free', 'pro'] as const).map(tier => <section key={tier} className="panel stack" aria-label={`${tier === 'free' ? 'Free' : 'Pro'} allowances`}>
          <h3>{tier === 'free' ? 'Free' : 'Pro'}</h3>
          {allowanceFields.map(field => <label key={field.key}>{field.label}<input name={`${tier}.${field.key}`} inputMode="numeric" pattern="[0-9]+" maxLength={7} required defaultValue={allowances.plans[tier][field.key as 'submissions' | 'questions' | 'forms']} aria-describedby={`${tier}-${field.key}-hint`} /><span id={`${tier}-${field.key}-hint`} className="fine">1–{field.max.toLocaleString('en-GB')}. Whole numbers only.</span></label>)}
        </section>)}</div>
        <p className="notice">Applies to existing and new accounts when saved. Reducing a response allowance can pause collection until the next reset. Reducing active-link limits keeps the oldest eligible links accepting responses. Nothing is deleted, and usage and reset dates are preserved.</p>
        <Checkbox name="confirmImpact" required>I understand these limits apply to all existing and new Free and Pro accounts.</Checkbox>
        <p className="fine">Pro limits must be at least Free limits. Prices, VAT, Pro-only features and AI generation safety limits are managed separately.</p>
      </ActionForm> : <p className="notice">Allowances could not be loaded. Check the database connection and reload before editing.</p>}
    </section>
    <section className="panel dashboard-section"><h2>Safe price changes</h2><p>When checkout is connected, a new amount requires a new Stripe Price. Existing subscriptions must retain their original Price unless you explicitly choose a separate migration. The checkout amount and displayed price must match before payment is offered.</p></section>
  </AdminShell>;
}
