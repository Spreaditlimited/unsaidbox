import { ReportForm } from "@/components/ReportForm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SiteShell } from "@/components/SiteShell";
import { canViewQuestion } from "@/lib/publishing.mjs";
import { publicResponses } from "@/lib/public-data";
import { Icon } from "@/components/ui/Icon";
import styles from "./thread.module.css";
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
      <div className={`wrap ${styles.page}`}>
        <nav className={styles.navigation} aria-label="Thread navigation">
          <Link href="/explore">← Explore threads</Link>
          <Link href={`/u/${q.account.username}`}>@{q.account.username}’s box <span aria-hidden="true">↗</span></Link>
        </nav>
        <div className={styles.layout}>
          <div className={styles.conversation}>
            <header className={styles.question}>
              <div className={styles.questionMeta}>
                <p className="eyebrow">A QUESTION FROM @{q.account.username}</p>
                <span className={styles.badge}>{q.acceptingResponses ? "Open for answers" : "Answers closed"}</span>
              </div>
              <h1 className="message-text">{q.body}</h1>
              {q.acceptingResponses && <Link className={`button ${styles.mobileAnswer}`} href={`/q/${id}/answer`}>Leave an anonymous answer <Icon name="arrow" /></Link>}
              <div className={styles.questionFooter}>
                <span><Icon name="globe" /> Public thread</span>
                <ReportForm questionId={id} />
              </div>
            </header>

            <section className={styles.responses} aria-labelledby="responses-heading">
              <div className={styles.sectionHeading}>
                <h2 id="responses-heading">Shared responses</h2>
                <span>Newest first</span>
              </div>
              <p className={styles.explanation}>Only responses the owner has chosen to make public appear here.</p>
              {replies.length ? (
                <div className={styles.responseList}>
                  {replies.map((r) => (
                    <article className={styles.response} key={r.id}>
                      <div className={styles.responseLabel}><span className={styles.smallIcon}><Icon name="inbox" /></span>Anonymous response</div>
                      <p className={`message-text ${styles.responseText}`}>{r.text}</p>
                      {r.ownerReply && (
                        <div className={styles.ownerReply}>
                          <p className={styles.ownerLabel}>@{q.account.username} replied <span>Owner</span></p>
                          <p className="message-text">{r.ownerReply}</p>
                        </div>
                      )}
                      <div className={styles.report}><ReportForm submissionId={r.id} /></div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={styles.empty}>
                  <span className={styles.emptyIcon}><Icon name="inbox" /></span>
                  <h3>No shared responses yet.</h3>
                  <p>{q.acceptingResponses ? "Have something to add? Your answer goes to the owner first. It won’t appear here automatically." : "The owner hasn’t shared any responses publicly. This thread is currently closed to new answers."}</p>
                  {q.acceptingResponses && <Link className="text-link" href={`/q/${id}/answer`}>Share your perspective <span aria-hidden="true">→</span></Link>}
                </div>
              )}
            </section>
            <Link className={styles.backLink} href="/explore">← Discover more conversations</Link>
          </div>

          <aside className={styles.sidebar} aria-label="Join the conversation">
            <div className={styles.answerCard}>
              <span className={styles.emptyIcon}><Icon name={q.acceptingResponses ? "question" : "inbox"} /></span>
              <h2>{q.acceptingResponses ? "What would you say?" : "Taking a pause."}</h2>
              <p>{q.acceptingResponses ? "A different perspective can mean a lot. Leave an anonymous answer for the owner." : "This question is no longer accepting answers. You can still read the responses shared here."}</p>
              {q.acceptingResponses && <>
                <Link className="button" href={`/q/${id}/answer`}>Leave an answer <Icon name="arrow" /></Link>
                <span className={styles.noAccount}>No account needed.</span>
              </>}
              <div className={styles.privacy}>
                <Icon name="shield" />
                <p>{q.sharingPolicy === "PRIVATE_ONLY" ? "Answers to this question are private-only and cannot be published or exported for sharing through UnsaidBox." : "Your name isn’t attached. The owner may choose to publish or share your words. Avoid identifying details."}</p>
              </div>
              <Link className="text-link" href="/safety">Privacy & safety <span aria-hidden="true">↗</span></Link>
            </div>
            {q.socialPostUrl && <a className={styles.social} href={q.socialPostUrl} target="_blank" rel="noopener noreferrer">View the conversation on Facebook <span aria-hidden="true">↗</span></a>}
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}
