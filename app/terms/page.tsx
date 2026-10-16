import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms for using UnsaidBox, including accounts, anonymous messages, content sharing and acceptable use.",
  alternates: { canonical: "https://unsaidbox.com/terms" },
  robots: { index: true, follow: true },
};

export default function Terms() {
  return (
    <SiteShell>
      <article className="reading-width section prose">
        <header>
          <p className="eyebrow">CLEAR EXPECTATIONS. THOUGHTFUL SHARING.</p>
          <h1>Terms of service</h1>
          <p className="lead">A few important boundaries that help keep UnsaidBox useful, respectful and safe.</p>
          <p className="fine">Effective date: <time dateTime="2026-10-07">7 October 2026</time></p>
        </header>

        <h2>1. Who we are and when these terms apply</h2>
        <p>UnsaidBox is operated by Tochukwu Tech and AI Academy Limited, a United Kingdom company. In these terms, “UnsaidBox”, “we”, “us” and “our” refer to that company. You can contact us at <a href="mailto:hello@unsaidbox.com">hello@unsaidbox.com</a> or through our <Link href="/contact">contact page</Link>.</p>
        <p>Company number: 17291472. Our registered office is 33 Bevan Court, Dunlop Street, Warrington, WA4 6AA, England.</p>
        <p>These terms apply when you create an account, send a message or answer, use a feedback form, or share content through UnsaidBox. Please read them before using the service. If you do not agree, do not create an account or submit content. Our <Link href="/safety">privacy and safety information</Link> and <Link href="/cookies">cookie information</Link> explain how information is handled; they do not replace these terms.</p>

        <h2>2. Age and accounts</h2>
        <p>UnsaidBox is for people aged 18 or over, including people submitting anonymous responses. You must be able to enter into a binding agreement. If you use UnsaidBox for an organisation, you must have authority to act for it.</p>
        <p>Provide accurate account information, keep your sign-in details secure and use an email address you control. Do not impersonate another person, share access irresponsibly or use someone else’s account without permission. Tell us promptly if you suspect unauthorised access. You are responsible for your own actions and for access you authorise, but not automatically for every unauthorised action merely because it happened through your account.</p>

        <h2>3. What UnsaidBox provides</h2>
        <p>UnsaidBox lets account owners collect anonymous messages, ask questions, collect form responses and choose whether eligible content is shared publicly. Features and availability may differ by account or service configuration. Activating a response link is not the same as making its content public.</p>
        <p>We do not guarantee that anyone will respond, that submissions are accurate, or that using the service will produce a particular outcome. User content is not advice from UnsaidBox. The service is not intended for emergencies, confidential professional advice or collecting highly sensitive records.</p>

        <h2>4. What anonymous means</h2>
        <p>An anonymous submission does not attach a sender account, name or email address to the message for its recipient. However, the words you enter, or information requested by a form, may identify you. Do not include details you do not want the recipient to know.</p>
        <p>Anonymity is not a promise of absolute untraceability or confidentiality. Infrastructure and security logs may contain connection information, and authorised administrators may access stored content for service operation, support, safety or legal requirements. We may disclose information where required by applicable law.</p>

        <h2>5. Submission privacy and sharing</h2>
        <p>Read the sharing notice on each inbox, question or form before submitting. Where sharing is permitted, the account owner may select eligible responses for publication on UnsaidBox or for sharing elsewhere, including social media and exported images. Sending a response does not guarantee that it will be published or answered.</p>
        <p>If a submission is marked private-only, its recipient must respect that promise and must not publish, export for sharing or otherwise disclose it without the sender’s separate permission, except where disclosure is legally required. The app restricts publication and share-card export for private-only content, but cannot prevent a recipient from manually copying or photographing what they can read.</p>
        <p>Account owners must honour the sharing conditions that applied when content was submitted. Do not misrepresent a sender’s meaning, reveal identifying information without a lawful basis, or change a privacy promise after receiving a response. Hiding or deleting content on UnsaidBox cannot remove screenshots, search-engine copies or content already shared on other services.</p>

        <h2>6. Your content and permissions</h2>
        <p>You retain any intellectual property rights you hold in content you submit. You must have the rights and permissions needed to submit it and must not infringe another person’s copyright, privacy or other rights.</p>
        <p>You give us a non-exclusive, royalty-free permission to host, store, process, format and display your content only as needed to provide, secure and support the service, comply with law, and carry out the sharing choices and permissions that apply to it. This is not a transfer of ownership or permission to use private submissions in unrelated advertising.</p>
        <p>Where a submission permits public sharing, you also permit its recipient to share it within the stated sharing conditions. This permission does not override a private-only promise. When content is deleted, our permission ends except for reasonable backup retention, legal obligations and copies already lawfully shared. Contact support if you need help with a content or rights concern.</p>

        <h2>7. Acceptable use</h2>
        <p>Do not use UnsaidBox to:</p>
        <ul>
          <li>Threaten, harass, stalk, bully, exploit or abuse anyone, or encourage violence or self-harm.</li>
          <li>Post illegal material, child sexual abuse material, non-consensual intimate content or hateful content targeting protected characteristics.</li>
          <li>Publish another person’s private details, credentials or sensitive information without a lawful basis.</li>
          <li>Impersonate others, defame people, run scams, send spam or infringe intellectual property rights.</li>
          <li>Distribute malicious code, bypass access controls, evade suspensions or overload the service.</li>
          <li>Attempt to identify anonymous senders through hacking, deception or unauthorised access.</li>
        </ul>
        <p>Account owners must use collection forms responsibly and must not solicit passwords, payment-card details, identity documents or other information unsuitable for an anonymous feedback service.</p>

        <h2>8. Moderation, reports and account restrictions</h2>
        <p>We may review reported content and restrict access, hide or remove content, or suspend an account where reasonably necessary to address a breach of these terms, unlawful activity, security risks or harm. We aim to make proportionate decisions and explain significant restrictions where practical and lawful. Urgent safety or legal issues may require action without advance notice.</p>
        <p>Use the reporting controls where available, or email <a href="mailto:hello@unsaidbox.com">hello@unsaidbox.com</a> with the relevant link and concern. You can use the same address to ask us to review a moderation decision. Reports are not a guarantee of removal or an immediate response. If someone is in immediate danger, contact the appropriate emergency services.</p>

        <h2>9. Availability, changes and third-party services</h2>
        <p>We aim to provide the service with reasonable care and skill. Maintenance, technical failures and circumstances outside our reasonable control may interrupt access. Keep your own lawful copies of content you need; UnsaidBox is not a permanent archive.</p>
        <p>We may improve or change features for technical, security, legal or operational reasons. Where a change materially reduces the service you use, we will give reasonable notice when practical, unless urgent circumstances prevent it. Links and content shared on third-party services are also subject to those services’ rules. UnsaidBox does not control or endorse them.</p>

        <h2>10. Charges</h2>
        <p>Creating an account does not by itself authorise a payment. If we offer a paid service, we will explain its price, applicable taxes, billing period, renewal and cancellation conditions before you purchase. You will not be moved from a free service to a paid subscription without agreeing to it. Nothing in these terms removes any statutory cancellation, refund or other consumer rights.</p>

        <h2>11. Closing your account</h2>
        <p>You may stop using UnsaidBox at any time and request account deletion by contacting <a href="mailto:hello@unsaidbox.com">hello@unsaidbox.com</a> from your registered email address. We may need to verify your request to protect the account. Deletion is subject to legal retention requirements, security needs and backup cycles, as explained in our privacy information or when we respond to your request.</p>
        <p>We may close an account for serious or repeated breaches of these terms. Where appropriate, we will give an opportunity to resolve the problem first. Closing an account does not recall content already shared outside UnsaidBox.</p>

        <h2>12. Responsibility and your legal rights</h2>
        <p>We are responsible for loss or damage you suffer that is a reasonably foreseeable result of our breach of these terms or our failure to use reasonable care and skill. We are not responsible for loss that was not reasonably foreseeable, or for another user’s conduct where we have not breached a legal duty.</p>
        <p>Nothing in these terms excludes or limits liability for fraud, fraudulent misrepresentation, death or personal injury caused by negligence, or any liability that cannot lawfully be excluded or limited. Nothing takes away mandatory consumer rights or remedies. If you use the service for business purposes, we do not promise business results or compensation for lost profits or business opportunities, except where the law requires otherwise.</p>

        <h2>13. Changes to these terms and resolving concerns</h2>
        <p>We may update these terms to reflect changes to the service or legal requirements. The effective date appears at the top of this page. We will give reasonable advance notice of material changes through the service or by email where practical; urgent legal or security changes may take effect sooner. Changes will not retrospectively remove rights you already have.</p>
        <p>Please contact us first so we can try to resolve a concern. These terms are governed by the laws of England and Wales, but this does not deprive consumers of mandatory protections under the law of their country of residence. You may bring proceedings in any court available to you under applicable law; these terms do not require consumers to use only courts in England and Wales.</p>
      </article>
    </SiteShell>
  );
}
