import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '@/components/SiteShell';
import { Arrow, Mark } from '@/components/Brand';
import { Icon } from '@/components/ui/Icon';
import { socialMetadata } from '@/lib/social-metadata';
import styles from './home.module.css';

const title = 'Anonymous Questions & Feedback for Creators | UnsaidBox';
const description = 'Collect anonymous messages, questions and feedback without sender sign-ups. Follow up privately and turn selected answers into beautiful share cards. Start free.';
export const metadata: Metadata = {
  title: { absolute: title }, description,
  robots: { index: true, follow: true }, alternates: { canonical: 'https://unsaidbox.com/' },
  ...socialMetadata({ title, description, url: 'https://unsaidbox.com/' }),
};
const faqs = [
  ['What is UnsaidBox?', 'UnsaidBox is an anonymous questions and feedback tool for creators, educators and community owners. Collect messages in a private inbox, ask specific questions, create feedback forms, and turn eligible responses into shareable cards.'],
  ['Do people need an account to send anonymous feedback?', 'No. Your audience opens your link and submits without creating an account or providing a name or email address. You need an account to create a box and manage responses. UnsaidBox is for adults aged 18 and over.'],
  ['Can I reply without finding out who sent the message?', 'Yes, when the sender opts in to private follow-ups. They receive a secret return link to check for replies and continue the conversation. No email or account is required. Links expire after 90 days; lost links cannot be recovered. Existing submissions cannot be opted in retrospectively.'],
  ['Are anonymous messages automatically public?', 'No. Messages arrive privately. Public sharing depends on the permissions shown to the sender and your publishing choices. Private-only submissions cannot be published or exported through UnsaidBox. Private follow-up conversations never appear on public pages or share cards.'],
  ['How do I share responses on Facebook or Instagram?', 'For eligible responses, copy the text or download square, portrait or story-sized cards. Long answers can span multiple cards. You can share the image using supported device sharing tools, or upload it yourself. UnsaidBox does not automatically post to Facebook or Instagram.'],
  ['Is UnsaidBox completely untraceable?', 'No. Senders are anonymous to the recipient: no sender profile is attached. Identifying details in the text can still reveal someone. UnsaidBox and its infrastructure and security providers process technical data to operate and protect the service. Read Privacy & safety before sharing sensitive information.'],
  ['What can I use for free, and what does Pro add?', 'Free includes an anonymous inbox, question links, feedback forms, private follow-ups and share cards within its usage limits. Pro adds higher limits, AI question ideas tailored to your niche, custom card branding, removal of UnsaidBox attribution and CSV exports. See Pricing for current allowances and prices.'],
];
const comparisons = [
  { name: 'Collecting honest answers', use: 'Compare how a tool handles open messages, specific questions and structured feedback.', reason: 'One private workspace for your anonymous inbox, question links and feedback forms.' },
  { name: 'Understanding the answer', use: 'Check whether you can ask for context while keeping the sender anonymous.', reason: 'Opt-in private follow-ups through a secret return link. No sender account or email needed.' },
  { name: 'Turning feedback into content', use: 'Look at the steps between receiving a response and having something ready to share.', reason: 'Edit the sharing text, choose a card format and colour, then download or share. Longer answers become multiple cards.' },
  { name: 'Making it your own', use: 'Check the branding options and which plan includes them.', reason: 'Pro gives you custom card branding and the option to remove UnsaidBox attribution, right in the sharing workflow.' },
];

export default function Home() {
  return <SiteShell><div className={styles.home}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
      '@context': 'https://schema.org', '@graph': [
        { '@type': 'WebSite', '@id': 'https://unsaidbox.com/#website', name: 'UnsaidBox', url: 'https://unsaidbox.com/', description },
        { '@type': 'FAQPage', mainEntity: faqs.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) },
      ],
    }).replace(/</g, '\\u003c') }} />
    <section className={`${styles.hero} wrap`}>
      <div className={styles.heroCopy}>
        <p className="eyebrow"><span className="dot" /> ANONYMOUS QUESTIONS & FEEDBACK</p>
        <h1>Honest answers.<br /><span className="serif accent">Ready to share.</span></h1>
        <p className={styles.lead}>Hear what your audience really wants to say. Collect anonymous messages, ask better questions, and turn selected answers into beautiful content.</p>
        <div className={styles.actions}><Link href="/start" className="button">Create your free box <Arrow /></Link><a href="#how-it-works" className="button secondary">See how it works</a></div>
        <p className={styles.reassurance}>No card needed to start. No sign-up needed to respond.</p>
      </div>
      <div className={styles.product} aria-label="Illustrated example: a question and a private answer">
        <span className={styles.orbit} aria-hidden="true" />
        <span className={styles.sceneCaption}>A little courage. A more honest connection.</span>
        <div className={styles.prompt}><span>A QUESTION WORTH ASKING</span><p>What’s one thing you wish we talked about more?</p><span className={styles.noteRule} aria-hidden="true" /></div>
        <div className={styles.response}>
          <div className={styles.productTop}><Mark className={styles.productMark} /><span>Someone had something to say</span><Icon name="shield" /></div>
          <span className={styles.quoteMark} aria-hidden="true">“</span>
          <p>The messy middle. Not just the success story, but the part where you nearly gave up.</p>
          <div className={styles.productBottom}><span>Anonymous words</span><span>Yours to listen to.</span></div>
        </div>
        <span className={styles.sceneTag}><Icon name="shield" /> Their words. Your choice to share.</span>
        <span className={styles.exampleLabel}>Illustrative response</span>
      </div>
    </section>
    <div className={`${styles.trust} wrap`}><span>One link. No app to download.</span><span>Anonymous to the recipient.</span><span>Public only by choice.</span></div>
    <section id="how-it-works" className={`${styles.section} wrap`}>
      <div className={styles.heading}><p className="eyebrow">FROM A QUESTION TO A CONNECTION</p><h2>Your audience is already there.<br /><span className="serif">Give them a way to open up.</span></h2><p>No new community to build. Share your link on Facebook, Instagram, WhatsApp, in your course or in your newsletter.</p></div>
      <div className={styles.steps}>{[
        ['01', 'Make space.', 'Create your box for open messages, ask a specific question, or start with a ready-made feedback form.'],
        ['02', 'Listen privately.', 'People respond without signing up. Review their words in your inbox and follow up when they have opted in.'],
        ['03', 'Share with intention.', 'Keep feedback private, publish eligible answers, or create a card to bring the conversation back to your audience.'],
      ].map(([n, heading, text]) => <article key={n}><span className={styles.number}>{n}</span><h3>{heading}</h3><p>{text}</p></article>)}</div>
    </section>
    <section className={styles.tint}><div className={`${styles.section} wrap`}>
      <div className={styles.heading}><p className="eyebrow">MORE THAN A PLACE TO DROP A MESSAGE</p><h2>Ask. Understand.<br /><span className="serif">Make something meaningful.</span></h2></div>
      <div className={styles.features}>
        <article className={styles.featureLarge}>
          <div className={styles.studioCopy}><span className={styles.featureTag}>THE SHARE STUDIO</span><h3>Words worth sharing.<br /><span className="serif">Already beautifully framed.</span></h3><p>Edit the version you share without changing the original. Choose a size and colour, preview your card, then download or share. Longer stories become readable sets of cards.</p><Link href="/start" className="button">Make their words go further <Arrow /></Link><p className="fine">Pro adds your own card branding and the option to remove UnsaidBox attribution.</p></div>
          <div className={styles.studioScene}><div className={styles.cardPreview}><div className={styles.cardBrand}><Mark /><span>ANONYMOUS WORDS</span></div><p>“Your next lesson could be the answer to the question nobody felt comfortable asking.”</p><div className={styles.cardFoot}><span>UnsaidBox</span><span>Illustrative response</span></div></div><div className={styles.formats}><span>Square</span><span>Portrait</span><span>Story</span></div></div>
        </article>
        <article><span className={styles.featureTag}>PRIVATE FOLLOW-UPS</span><h3>“Could you tell me a little more?”</h3><p>Sometimes the first answer is only the beginning. When a sender opts in, continue through a private return link. No names, no email addresses, no public thread.</p><div className={styles.bubbles}><p>Which part of the lesson would you like me to revisit?</p><p>The practical example. One more walkthrough would really help.</p></div><p className="fine">Illustrative conversation. Both sides can close it. Follow-up replies stay private.</p></article>
        <article><span className={styles.featureTag}>QUESTIONS & FORMS</span><h3>A quick answer.<br />Or a little more detail.</h3><p>Use a question link for one thought. Use feedback forms for structured answers, ratings and choices. Start with a template and make it relevant to your audience.</p><Link href="/templates" className="text-link">Find a feedback template <Arrow /></Link></article>
        <article><span className={styles.featureTag}>AI QUESTION IDEAS · PRO</span><h3>Get past “ask me anything.”</h3><p>Tell us your niche, audience and goal. Get question ideas you can edit, dismiss or make your own—before asking real people for real answers.</p><Link href="/pricing" className="text-link">Explore Pro <Arrow /></Link></article>
        <article><span className={styles.featureTag}>YOUR BOX. YOUR BOUNDARIES.</span><h3>Keep it private.<br />Or open a window.</h3><p>A public page is optional. Choose which eligible questions and answers people can see. Collecting responses and making them public are separate decisions.</p><Link href="/safety" className="text-link">Understand the privacy controls <Arrow /></Link></article>
      </div>
    </div></section>
    <section className={`${styles.section} wrap`}>
      <div className={styles.heading}><p className="eyebrow">BUILT AROUND YOUR AUDIENCE</p><h2>For the questions<br /><span className="serif">the comments don’t answer.</span></h2></div>
      <div className={styles.useCases}>{[
        ['Creators & community owners', 'Find your next conversation.', 'Ask what people are struggling with, collect stories and share thoughtful responses back on your own channels.', '“What do you wish someone had told you before you started?”'],
        ['Course creators & educators', 'Hear from the quiet learners.', 'Collect honest course feedback, find confusing lessons and ask follow-up questions without putting anyone on the spot.', '“What would make the next module more useful to you?”'],
        ['Coaches & small businesses', 'Understand what matters.', 'Invite candid feedback about an experience, resource or offer. Look for themes before deciding what to improve.', '“What almost stopped you from taking the first step?”'],
      ].map(([label, heading, text, prompt]) => <article key={label}><span className={styles.featureTag}>{label}</span><h3>{heading}</h3><p>{text}</p><blockquote>{prompt}</blockquote></article>)}</div>
    </section>
    <section id="compare" className={`${styles.section} ${styles.comparison} wrap`}>
      <div className={styles.heading}><p className="eyebrow">WHY CHOOSE UNSAIDBOX?</p><h2>Don’t just collect answers.<br /><span className="serif">Make more of them.</span></h2><p>Your workflow shouldn’t end at the inbox. UnsaidBox brings asking, listening and sharing together—so you can spend more time connecting with your audience.</p></div>
      <div className={styles.comparisonRows}>
        <div className={styles.tableHeading} aria-hidden="true"><span>What matters to you</span><span>Other tools · what to check</span><span>With UnsaidBox</span></div>
        {comparisons.map(c => <article className={styles.compareRow} key={c.name}><div><h3>{c.name}</h3></div><div><span className={styles.mobileLabel}>Other tools · what to check</span><p>{c.use}</p></div><div><span className={styles.mobileLabel}>With UnsaidBox</span><p>{c.reason}</p></div></article>)}
      </div>
      <p className={styles.sourceNote}>Features vary across other tools and plans. With UnsaidBox, you can start free and add Pro when you need more.</p>
      <div className={styles.choose}><div><h3>Choose UnsaidBox if you want to listen—and do something with what you hear.</h3><p>One place to collect private feedback, continue a conversation, and prepare permitted responses for your existing audience.</p></div><Link href="/start" className="button">Create your free box <Arrow /></Link></div>
    </section>
    <section className={`${styles.section} ${styles.faq} wrap`}>
      <div><p className="eyebrow">A FEW THINGS WORTH KNOWING</p><h2>Honest questions.<br /><span className="serif">Clear answers.</span></h2><p>Explore <Link href="/pricing">Free and Pro</Link>, read our <Link href="/safety">privacy & safety information</Link>, or find practical ideas in the <Link href="/blog">UnsaidBox journal</Link>.</p></div>
      <div>{faqs.map(([q, a]) => <details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div>
    </section>
    <section className={`${styles.closing} wrap`}><div className={styles.closingInner}><Mark className={styles.closingMark} /><p className="eyebrow">YOUR NEXT GOOD CONVERSATION STARTS HERE</p><h2>Make room for<br /><span className="serif">what’s really on their mind.</span></h2><p>Start with a free box. Share one link.<br />See what your audience has to say.</p><div className={styles.actions}><Link href="/start" className="button">Create your free box <Arrow /></Link><Link href="/pricing" className="button secondary">Compare plans</Link></div><p className={styles.reassurance}>No credit card required. Upgrade when you need more.</p></div></section>
  </div></SiteShell>;
}
