import Link from 'next/link';
import { SiteShell } from '@/components/SiteShell';
import { getBillingPricing } from '@/lib/billing-pricing';
import { socialMetadata } from '@/lib/social-metadata';
import { PricingCards } from './PricingCards';
import { getPlanConfiguration } from '@/lib/plan-configuration';
import styles from './pricing.module.css';

export const dynamic = 'force-dynamic';
const description = 'Start collecting anonymous messages for free. Explore UnsaidBox Pro pricing, response allowances, custom share cards and exports.';
export const metadata = {
  title: 'Simple pricing for honest conversations', description,
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://unsaidbox.com/pricing' },
  ...socialMetadata({ title: 'UnsaidBox pricing — Start free. Grow at your pace.', description, url: 'https://unsaidbox.com/pricing' }),
};
const questions = [
  ['Do people need an account to respond?', 'No. Share your inbox, question or form link. Your audience can respond without creating an UnsaidBox account.'],
  ['Are messages published automatically?', 'Never. Responses arrive privately, and eligible responses are shared only by choice. Private-only messages cannot become public share cards. Pro owners can export new and existing responses for private analysis without a separate sender opt-in. This does not give permission to publish them.'],
  ['What counts as a response?', 'One inbox message, one answer to a question, or one completed form counts as one response. A completed form counts once, even when it contains several answers.'],
  ['When does the allowance reset?', 'Free allowances reset monthly from registration. Pro allowances reset monthly from the subscription billing anchor, including annual subscriptions. Shorter months use the last available day; reset times are shown in UTC. Deleting responses does not restore the allowance.'],
  ['What happens if I reach a limit?', 'Reaching the monthly allowance pauses new submissions until the next reset or an upgrade. Existing responses stay available. There are no automatic overage charges. Pause an active question or form to free a slot for another.'],
  ['What happens if I cancel Pro?', 'Cancellation stops the next renewal. Verified paid access continues until the end of the paid period. Your content stays saved; the oldest active links within the Free limits can continue collecting responses. Custom branding reverts to UnsaidBox branding and Pro exports become unavailable.'],
  ['Can I subscribe to Pro today?', 'Yes. Create an account, then choose Pro in Plan & billing. Review your recurring price and any applicable VAT at checkout. Free accounts do not require payment details.'],
];

export default async function PricingPage() {
  let allowances: Awaited<ReturnType<typeof getPlanConfiguration>> | null = null;
  try { allowances = await getPlanConfiguration(); } catch { /* Never advertise stale allowances. */ }
  let prices: Awaited<ReturnType<typeof getBillingPricing>> = null;
  try { prices = await getBillingPricing(); } catch { /* Keep free signup available without inventing a paid price. */ }
  return <SiteShell><div className={`wrap ${styles.page}`}>
    <header className={styles.hero}><p className="eyebrow">YOUR BOX. YOUR PACE.</p><h1>Make room for honesty.<br /><em>Start for free.</em></h1><p>A simple way to hear from your audience.<br />More room and your own branding when you’re ready to grow.</p><div className={styles.promises}><span>No card needed to start</span><span>No account needed to respond</span><span>Private by default</span></div></header>
    {allowances ? <PricingCards plans={allowances.plans} prices={prices?.prices ?? null} tax={prices?.tax} /> : <p className="notice">Plan allowances are temporarily unavailable. Please try again shortly.</p>}
    <section className={styles.included} aria-labelledby="included-title"><div><p className="eyebrow">THE IMPORTANT THINGS COME STANDARD</p><h2 id="included-title">Your boundaries.<br />On every plan.</h2></div><div className={styles.includedGrid}><article><span aria-hidden="true">01</span><h3>A private place to listen</h3><p>Receive messages in your dashboard. Nothing goes public without your decision.</p></article><article><span aria-hidden="true">02</span><h3>One link. Less friction.</h3><p>Invite honest answers with a link your audience can open without signing up.</p></article><article><span aria-hidden="true">03</span><h3>Share with intention</h3><p>Create share cards from eligible responses. Keep private-only messages private.</p></article></div></section>
    <section className={styles.faq} aria-labelledby="faq-title"><div><p className="eyebrow">A LITTLE MORE CLARITY</p><h2 id="faq-title">Good questions.<br />Straight answers.</h2><p>Something else on your mind?<br /><Link href="/contact">Talk to us</Link></p></div><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
    <section className={styles.closing}><h2>Your next honest conversation<br />starts with a link.</h2><Link href="/start" className="button">Create your free box <span aria-hidden="true">↗</span></Link><p>No payment details. Just space for the unsaid.</p></section>
  </div></SiteShell>;
}
