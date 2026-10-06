import { ReportForm } from "@/components/ReportForm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SiteShell } from "@/components/SiteShell";
import { publicResponses } from "@/lib/public-data";
export const dynamic = "force-dynamic";
export default async function Profile({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const a = await db().account.findFirst({
    where: { username, status: "ACTIVE", publicPageEnabled: true },
    select: {
      id: true,
      username: true,
      displayName: true,
      introduction: true,
      status: true,
      publicPageEnabled: true,
    },
  });
  if (!a || a.status !== "ACTIVE" || !a.publicPageEnabled) notFound();
  const [questions, messages] = await Promise.all([
    db().question.findMany({
      where: { accountId: a.id, linkActive: true, publicVisible: true },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, body: true },
    }),
    publicResponses(a.id, null),
  ]);
  return (
    <SiteShell>
      <section className="wrap section profile-layout">
        <aside className="profile-card">
          <span className="badge">{a.username}</span>
          <h1>{a.displayName}</h1>
          <p>{a.introduction}</p>
          <Link className="button" href={`/u/${username}/ask`}>
            Send an anonymous message
          </Link>
        </aside>
        <div>
          <h2>Shared with intention.</h2>
          <div className="response-list">
            {questions.map((q) => (
              <article className="thread-card" key={q.id}>
                <h3>
                  <Link href={`/q/${q.id}`}>{q.body}</Link>
                </h3>
                <Link className="text-link" href={`/q/${q.id}`}>
                  View thread →
                </Link>
                <ReportForm questionId={q.id} />
              </article>
            ))}
            {messages.map((r) => (
              <article className="response-card" key={r.id}>
                <p className="message-text">{r.text}</p>
                {r.ownerReply && (
                  <div className="owner-reply">
                    <span className="fine">{a.displayName} replied</span>
                    <p className="message-text">{r.ownerReply}</p>
                  </div>
                )}
                <ReportForm submissionId={r.id} />
              </article>
            ))}
          </div>
          {!questions.length && !messages.length && (
            <p className="empty-state">Nothing shared publicly yet.</p>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
