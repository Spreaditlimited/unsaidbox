import { SiteShell } from "@/components/SiteShell";
export const metadata = { title: "Privacy and safety", robots: { index: true, follow: true }, alternates: { canonical: "https://unsaidbox.com/safety" } };
export default function Safety() {
  return (
    <SiteShell>
      <section className="reading-width section prose">
        <p className="eyebrow">TRUST IS PART OF THE PRODUCT</p>
        <h1>Clear boundaries.</h1>
        <p className="lead">
          UnsaidBox is for adults aged 18 and over. Avoid sharing sensitive
          personal information in your messages.
        </p>
        <h2>What is saved?</h2>
        <p>
          Account details, password hashes, sessions, real inbox messages,
          question responses and moderation records are stored in the dedicated
          UnsaidBox database.
        </p>
        <h2>Anonymous to the recipient</h2>
        <p>
          No sender account, email address or name is attached to an anonymous
          submission. The owner sees the text you send, so do not include
          identifying details. This is not a promise of absolute untraceability:
          server and infrastructure logs can contain connection information.
          Administrators with database access can access stored content.
        </p>
        <h2>Private first</h2>
        <p>
          Each form explains whether its owner may share your words.
          Private-only messages are blocked from publication and share-card
          export in the app, even if settings change later. UnsaidBox cannot
          prevent a recipient from manually copying or photographing words they
          can read.
        </p>
        <h2>Private-analysis downloads</h2>
        <p>Recipients can review their responses and, with Pro, download new and existing responses for their own private analysis without a separate sender opt-in. This does not permit public sharing. Anonymous text can still contain identifying details, so avoid including sensitive personal information and keep analysis files private. Export files are access-controlled and expire after 24 hours; a copy already downloaded is outside UnsaidBox and cannot be recalled. Private follow-up messages are not included in exports.</p>
        <h2>Optional private follow-ups</h2>
        <p>Senders can opt in when submitting a message, answer or form. We store a hash of a secret return link, the conversation and its replies. No sender name, email or account is required. Anyone with that link can access the conversation as the sender, so keep it private. An essential, HTTP-only cookie remembers access on that browser. Lost links cannot be recovered.</p>
        <p>Follow-up replies never appear in public pages, share cards or CSV exports. Either side can permanently close the conversation. Return access expires after 90 days; expiry does not erase stored replies. Deleting the original submission or form entry also removes its conversation. Senders can report a concern from the conversation. Administrators with database access can access stored content; this is not end-to-end encrypted messaging. No email notifications are sent for private replies.</p>
        <h2>Public sharing</h2>
        <p>
          Owners must approve and explicitly publish individual responses.
          Public pages are optional; Explore also requires owner opt-in and
          moderator approval. Public-content reports enter a moderation queue.
          Reports do not automatically remove content. This is not an emergency
          service.
        </p>
        <h2>Your controls</h2>
        <p>
          Owners can close inboxes, deactivate question links, hide content, and
          delete hidden questions and responses. Copies already shared outside
          UnsaidBox cannot be recalled. Session cookies keep account owners
          signed in; no sender identity is attached to message records.
        </p>
        <h2>Support and account emails</h2>
        <p>You can also request marketing updates without creating an account. We store your first name, email address, consent wording/version and request/confirmation times separately from anonymous submissions. A single-use confirmation link expires after 24 hours; opening the page alone does not subscribe you. We store a hash of that token and never use it to sign you into an account. Confirmed email signups join the UnsaidBox marketing audience; unsubscribe through any marketing email.</p>
        <p>Marketing emails are optional. Verified account owners can choose UnsaidBox tips, product updates and occasional offers in their dashboard. We record the consent wording, version, source and time of each choice. Registering, paying for a plan or submitting anonymous feedback does not subscribe anyone to marketing.</p>
        <p>Brevo processes marketing subscriber email addresses and campaign delivery and engagement information. We do not send anonymous submissions or private inbox links to Brevo for marketing. Withdraw consent in dashboard Settings or use the unsubscribe link in an email. Withdrawal does not disable essential account and security emails. A campaign already submitted for processing may still arrive.</p>
        <p>
          Contacting support is different from sending an anonymous message: the
          contact form sends your name, email address, subject and enquiry to
          our support mailbox so we can reply. Avoid including sensitive
          information.
        </p>
        <p>
          Optional Analytics is controlled by Cookie settings. For details about
          storage and live-site Google reCAPTCHA, read our{" "}
          <a href="/cookies">cookie information</a>.
        </p>
        <p>
          New accounts confirm their email before collecting messages. Optional
          inbox notifications do not include anonymous message content. Contact
          hello@unsaidbox.com with privacy or account-deletion requests.
        </p>
      </section>
    </SiteShell>
  );
}
