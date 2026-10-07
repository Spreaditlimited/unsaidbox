import { ReportForm } from "@/components/ReportForm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SiteShell } from "@/components/SiteShell";
import { canViewQuestion } from "@/lib/publishing.mjs";
import { publicResponses } from "@/lib/public-data";
export const dynamic = "force-dynamic";
export default async function Thread({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const q = await db().question.findFirst({
    where: {
      id,
      linkActive: true,
      publicVisible: true,
      account: { status: "ACTIVE", publicPageEnabled: true },
    },
    include: {
      account: {
        select: {
          username: true,
          status: true,
          publicPageEnabled: true,
        },
      },
    },
  });
  if (!q || !canViewQuestion(q, q.account)) notFound();
  const replies = await publicResponses(q.accountId, id);
  return (
    <SiteShell>
      <section className="reading-width section">
        <Link className="text-link" href={`/u/${q.account.username}`}>
          @{q.account.username}’s box
        </Link>
        <header className="thread-heading">
          <h1 className="message-text">{q.body}</h1>
          <div className="action-row">
            <Link className="button" href={`/q/${id}/answer`}>
              {q.acceptingResponses
                ? "Leave an anonymous answer"
                : "View answer link"}
            </Link>
            {q.socialPostUrl && (
              <a
                className="button secondary"
                href={q.socialPostUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Follow on Facebook ↗
              </a>
            )}
          </div>
          <ReportForm questionId={id} />
        </header>
        <h2>Shared responses</h2>
        <div className="response-list">
          {replies.map((r) => (
            <article className="response-card" key={r.id}>
              <p className="message-text">{r.text}</p>
              {r.ownerReply && (
                <div className="owner-reply">
                  <span className="fine">@{q.account.username} replied</span>
                  <p className="message-text">{r.ownerReply}</p>
                </div>
              )}
              <ReportForm submissionId={r.id} />
            </article>
          ))}
        </div>
        {!replies.length && <p>No responses have been shared publicly yet.</p>}
      </section>
    </SiteShell>
  );
}
