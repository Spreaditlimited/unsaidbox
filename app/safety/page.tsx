import { SiteShell } from "@/components/SiteShell";
export const metadata = { title: "Privacy and safety" };
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
