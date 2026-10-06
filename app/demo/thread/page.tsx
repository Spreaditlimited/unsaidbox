import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { demoQuestion, demoResponses } from "@/lib/demo";
export const metadata = { title: "A question about starting over" };
export default function ThreadDemo() {
  return (
    <SiteShell>
      <section className="reading-width section">
        <Link className="text-link" href="/demo">
          ← Alex’s example page
        </Link>
        <header className="thread-heading">
          <span className="badge">ILLUSTRATIVE THREAD · NOT LIVE</span>
          <p className="eyebrow">ALEX ASKS</p>
          <h1>{demoQuestion}</h1>
          <p className="lead">
            Some fresh starts are loud. Others happen quietly. What helped you
            find your feet?
          </p>
          <Link className="button" href="/demo/answer">
            Try leaving an answer ↗
          </Link>
        </header>
        <div className="section-heading compact">
          <h2>Selected responses</h2>
          <span className="fine">Fictional examples</span>
        </div>
        <div className="response-list">
          {demoResponses.map((response, i) => (
            <article className="response-card" key={response.id}>
              <div className="response-meta">
                <span>ANONYMOUS WORDS</span>
                <span>0{i + 1}</span>
              </div>
              <p>{response.body}</p>
            </article>
          ))}
        </div>
        <div className="quiet-note">
          <p>
            A thread is a curated collection. There are no nested comments here.
            In the live product, owners can link to a conversation on their
            socials.
          </p>
        </div>
        <Link className="button secondary" href="/demo/share">
          Try sharing these responses ↗
        </Link>
      </section>
    </SiteShell>
  );
}
