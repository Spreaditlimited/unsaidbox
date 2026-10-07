import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export const metadata = { title: "Explore" };
export default async function Explore() {
  const questions = await db().question.findMany({
    where: {
      linkActive: true,
      publicVisible: true,
      discoverable: true,
      discoveryApproved: true,
      account: { status: "ACTIVE", publicPageEnabled: true },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      body: true,
      account: { select: { username: true } },
    },
  });
  return (
    <SiteShell>
      <section className="page-intro wrap">
        <p className="eyebrow">A WINDOW INTO THE UNSAID</p>
        <h1>
          Honest words.
          <br />
          <span className="serif accent">Shared with intention.</span>
        </h1>
        <p className="lead">
          Public, opted-in threads reviewed for discovery. Private inboxes never
          become a feed.
        </p>
      </section>
      <section className="wrap section">
        <div className="app-grid">
          {questions.map((q) => (
            <article key={q.id} className="thread-card">
              <span className="fine">@{q.account.username}</span>
              <h3>
                <Link href={`/q/${q.id}`}>{q.body}</Link>
              </h3>
              <Link className="text-link" href={`/q/${q.id}`}>
                View thread →
              </Link>
            </article>
          ))}
        </div>
        {!questions.length && (
          <div className="empty-state">
            <h2>No featured threads yet.</h2>
            <p>
              Threads appear here only after their owner opts in and a moderator
              approves.
            </p>
            <Link className="button secondary" href="/start">
              Create your box
            </Link>
          </div>
        )}
      </section>
    </SiteShell>
  );
}
