import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { demoQuestion } from "@/lib/demo";
export const metadata = { title: "An example personal page" };
export default function ProfileDemo() {
  return (
    <SiteShell>
      <section className="wrap profile-layout section">
        <aside className="profile-card">
          <span className="badge">EXAMPLE PROFILE</span>
          <div className="avatar" aria-hidden="true">
            a.
          </div>
          <h1>Alex’s box</h1>
          <p className="handle">@alex · Fictional demo</p>
          <p>
            A little space for life’s big questions. Tell me what’s on your
            mind. I’ll share selected words that might help someone else.
          </p>
          <Link className="button" href="/demo/ask">
            Send a message ↗
          </Link>
          <p className="fine">
            Anonymous to the recipient.
            <br />
            Always thoughtful. Always your choice.
          </p>
        </aside>
        <div>
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">SELECTED, NOT EVERYTHING</p>
              <h2>From this box</h2>
            </div>
            <span className="badge">SAMPLE CONTENT</span>
          </div>
          <article className="thread-card">
            <span className="badge">OPEN QUESTION · DEMO</span>
            <h3>
              <Link href="/demo/thread">{demoQuestion}</Link>
            </h3>
            <p className="muted">
              Some fresh starts are loud. Others happen quietly. What helped you
              find your feet?
            </p>
            <div className="thread-footer">
              <span>3 illustrative responses</span>
              <Link className="text-link" href="/demo/thread">
                Read the thread ↗
              </Link>
            </div>
          </article>
          <div className="quiet-note">
            <span aria-hidden="true">↙</span>
            <p>
              This is a curated public page, not the owner’s inbox. Only
              intentionally published items would appear here.
            </p>
          </div>
          <Link className="button secondary" href="/demo/answer">
            Try answering the question
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
