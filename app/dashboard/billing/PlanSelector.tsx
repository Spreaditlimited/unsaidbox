"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { checkoutSummary } from "@/lib/billing-display.mjs";
import { plans as defaultPlans } from "@/lib/plan-policy.mjs";
import { startCheckout } from "./actions";
import styles from "./billing.module.css";

export function PlanSelector({ prices, plans = defaultPlans, revision, availableKeys, canCheckout, hasSubscription, testMode = true, tax = { enabled: false, basisPoints: 0, revision: 0 } }: {
  plans?: typeof defaultPlans;
  testMode?: boolean;
  prices: Record<string, number>; revision: number; availableKeys: string[];
  canCheckout: boolean; hasSubscription: boolean;
  tax?: { enabled: boolean; basisPoints: number; revision: number };
}) {
  const [currency, setCurrency] = useState("GBP");
  const [interval, setInterval] = useState("month");
  const summary = checkoutSummary(prices, currency, interval, tax);
  const ready = canCheckout && availableKeys.includes(summary.key);
  return <section className={`panel ${styles.planPanel}`} aria-labelledby="pro-plan-heading">
    <div className={styles.planIntro}>
      <span className={styles.planIcon} aria-hidden="true">↗</span>
      <p className="eyebrow">YOUR NEXT CHAPTER</p>
      <h2 id="pro-plan-heading">A little more room.<br />A lot more possibility.</h2>
      <p>Everything in Free, plus more room to listen, fresh question ideas, and sharing that feels like your brand.</p>
      <ul className={styles.assurances}>
        <li>{plans.pro.submissions.toLocaleString('en-GB')} responses per monthly allowance period across inbox messages, question answers and completed forms</li>
        <li>Up to {plans.pro.questions} active questions collecting answers at once</li>
        <li>Up to {plans.pro.forms} active feedback forms</li>
        <li>AI question ideas tailored to your niche, audience, goal and tone — five ideas per generation, up to 50 attempts a day and 10 per hour</li>
        <li>Your own brand name, logo and accent colour on share cards</li>
        <li>Remove UnsaidBox branding from your share cards</li>
        <li>CSV exports of eligible responses with sharing permission, in batches of up to 200</li>
        <li>Keep all Free features, including your private inbox, shareable links and downloadable response cards</li>
      </ul>
      {testMode ? <p className={styles.testNote}>Test payments only. No real charges.</p> : null}
    </div>
    <div id="upgrade-pro" className={styles.planPurchase} tabIndex={-1} style={{ scrollMarginTop: '96px' }}>
      <div className={styles.planTitle}><h3>UnsaidBox Pro</h3>{testMode ? <span className="badge">Sandbox preview</span> : null}</div>
      <div className={styles.choiceField}><span id="billing-currency-label">Currency</span>
        <div className={styles.segment} role="group" aria-labelledby="billing-currency-label">
          {[['GBP', 'GBP · £'], ['USD', 'USD · $']].map(([value, label]) => <button key={value} type="button" aria-pressed={currency === value} onClick={() => setCurrency(value)}>{label}</button>)}
        </div>
      </div>
      <div className={styles.choiceField}><span id="billing-period-label">Billing period</span>
        <div className={styles.segment} role="group" aria-labelledby="billing-period-label">
          {[['month', 'Monthly'], ['year', 'Yearly']].map(([value, label]) => <button key={value} type="button" aria-pressed={interval === value} onClick={() => setInterval(value)}>{label}</button>)}
        </div>
      </div>
      <div className={styles.priceSummary} aria-live="polite" aria-atomic="true">
        <p><strong>{summary.amount}</strong><span> / {summary.cadence.replace('per ', '')}</span></p>
        <span>{summary.renewal} in {currency}</span>
        <small>{summary.saving || 'Choose the schedule that fits your plans.'}</small>
        <p className="fine">{summary.taxNote}</p>
      </div>
      {ready ? <ActionForm action={startCheckout} label={`Continue with Pro · ${summary.total}`} captchaAction="startCheckout">
        <input type="hidden" name="taxRevision" value={tax.revision} />
        <input type="hidden" name="revision" value={revision} />
        <input type="hidden" name="priceKey" value={summary.key} />
        {testMode ? <p className="fine">Test checkout only. Use a Stripe test card, not a real card.</p> : <p className="fine">Review your recurring subscription and total securely at checkout.</p>}
      </ActionForm> : <p className={styles.unavailable}>{hasSubscription ? 'You already have a subscription. Use the management options below.' : 'Checkout for this option is not available yet. Your account is unchanged.'}</p>}
      <p className={styles.secureNote}>Secure checkout by Stripe · No card details stored here</p>
      <div className={styles.billingReassurance}>
        <h4>Flexible billing. Your content stays yours.</h4>
        <p>Choose monthly or yearly billing. Manage invoices and cancellation in your dashboard; cancelling never deletes your saved content.</p>
      </div>
    </div>
  </section>;
}
