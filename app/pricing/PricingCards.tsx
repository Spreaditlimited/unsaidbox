'use client';
import Link from 'next/link';
import { useState } from 'react';
import { checkoutSummary } from '@/lib/billing-display.mjs';
import { plans as defaultPlans } from '@/lib/plan-policy.mjs';
import styles from './pricing.module.css';

export function PricingCards({ prices, plans = defaultPlans, tax = { enabled: false, basisPoints: 0 } }: { prices: Record<string, number> | null; plans?: typeof defaultPlans; tax?: { enabled: boolean; basisPoints: number } }) {
  const [currency, setCurrency] = useState<'GBP' | 'USD'>('GBP');
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const summary = prices ? checkoutSummary(prices, currency, interval, tax) : null;
  return <section aria-label="Choose your plan" className={styles.plans}>
    <div className={styles.controls}>
      <div><span id="pricing-currency">Currency</span><div role="group" aria-labelledby="pricing-currency" className={styles.segment}>{(['GBP', 'USD'] as const).map(value => <button type="button" key={value} aria-pressed={currency === value} onClick={() => setCurrency(value)}>{value === 'GBP' ? 'GBP £' : 'USD $'}</button>)}</div></div>
      <div><span id="pricing-period">Billing period</span><div role="group" aria-labelledby="pricing-period" className={styles.segment}>{(['month', 'year'] as const).map(value => <button type="button" key={value} aria-pressed={interval === value} onClick={() => setInterval(value)}>{value === 'month' ? 'Monthly' : 'Yearly'}</button>)}</div></div>
    </div>
    <p className={styles.launchNote}><span className={styles.dot} aria-hidden="true" />Start free. Upgrade when you need more room.</p>
    <div className={styles.cards}>
      <article className={styles.card}><div className={styles.cardIntro}><span className={styles.planLabel}>A LITTLE SPACE TO START</span><h2>Free</h2><p>For personal questions, thoughtful feedback and your first conversations.</p></div><div className={styles.price}><strong>{currency === 'GBP' ? '£0' : '$0'}</strong><span>No subscription</span><small>No payment details required.</small></div><Link className="button secondary" href="/start">Create your free box <span aria-hidden="true">↗</span></Link><h3>Your allowance</h3><ul><li><strong>{plans.free.submissions.toLocaleString('en-GB')}</strong> responses per month</li><li><strong>{plans.free.questions}</strong> active questions</li><li><strong>{plans.free.forms}</strong> active feedback forms</li><li>Anonymous inbox and private dashboard</li><li>Ready-to-customise form templates</li><li>Share cards with UnsaidBox branding</li></ul></article>
      <article className={`${styles.card} ${styles.pro}`}><div className={styles.cardIntro}><span className={styles.planLabel}>MORE ROOM. MORE YOU.</span><div className={styles.proTitle}><h2>Pro</h2><span>For growing communities</span></div><p>For creators and communities who want more capacity and their own look.</p></div><div className={styles.price} aria-live="polite" aria-atomic="true">{summary ? <><strong>{summary.amount}</strong><span>{summary.cadence}</span><small>{summary.renewal}{summary.saving ? ` · ${summary.saving}` : ''}</small></> : <><strong className={styles.unavailablePrice}>Price unavailable</strong><small>We couldn’t load the current price. Please try again later.</small></>}</div><Link className="button" href="/dashboard/billing#upgrade-pro">Explore Pro</Link><h3>Everything in Free, plus</h3><ul><li><strong>{plans.pro.submissions.toLocaleString('en-GB')}</strong> responses per month</li><li><strong>{plans.pro.questions}</strong> active questions</li><li><strong>{plans.pro.forms}</strong> active feedback forms</li><li>Your name, colour and logo on share cards</li><li>Remove UnsaidBox share-card attribution</li><li>CSV exports of eligible responses</li></ul></article>
    </div>
    <p className={styles.priceNote}>Also included with Pro: AI questions tailored to your niche. Five suggestions per generation, up to 50 generation attempts per day (UTC), with a limit of 10 per hour. Review and edit before sharing.</p>
    {summary ? <p className={styles.priceNote} aria-live="polite">{tax.enabled ? `Plan prices exclude VAT. ${summary.taxNote} ${summary.cadence}.` : summary.taxNote}</p> : null}
    <p id="pro-unavailable" className={styles.priceNote}>Review your plan, recurring total and any applicable VAT before confirming payment.</p>
  </section>;
}
