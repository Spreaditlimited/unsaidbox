import Link from 'next/link';
import { db } from '@/lib/db';
import { requireAccount } from '@/lib/auth';
import { followupsReady } from '@/lib/followups';
import { DashboardShell } from '@/components/DashboardShell';
import styles from './followups.module.css';
export default async function FollowupsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const a = await requireAccount();
  const ready = await followupsReady();
  const page = Math.max(1, Math.min(10000, Number.parseInt((await searchParams).page ?? '1') || 1));
  const items = ready ? await db().followupConversation.findMany({ where: { accountId: a.id }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 21,
    select: { id: true, closedAt: true, expiresAt: true, messageCount: true, lastSenderAt: true, lastOwnerAt: true, submission: { select: { body: true } }, entry: { select: { form: { select: { title: true } } } } },
  }) : [];
  return <DashboardShell accountId={a.id} name={a.displayName} section="followups">
    <div className={styles.page}><header className={styles.header}>
    <p className="eyebrow">HONESTY DOESN’T HAVE TO END AT SEND</p><h1>Private follow-ups.</h1>
    <p>Ask for context, say thank you, or keep listening. Only senders who opted in can receive replies. No names or email addresses are revealed.</p>
    </header>
    {!ready ? <p className="notice">Private follow-ups will be available after the database update is installed.</p> : !items.length ? <section className="panel"><h2>Your next conversation starts with consent.</h2><p>When someone opts in while sending a message, answer or form, their conversation appears here. Existing submissions cannot be opted in retrospectively.</p></section> : null}
    <div className={styles.list}>{items.slice(0, 20).map(c => <article key={c.id} className={`panel ${styles.card}`}>
      <span className="badge">{c.closedAt || c.expiresAt <= new Date() || c.messageCount >= 100 ? 'CLOSED' : c.lastSenderAt && (!c.lastOwnerAt || c.lastSenderAt > c.lastOwnerAt) ? 'SENDER REPLIED' : 'PRIVATE CONVERSATION'}</span>
      <p className="message-text">{(c.submission?.body ?? c.entry?.form.title ?? '').slice(0, 200)}</p>
      <div className={styles.actions}><span className="fine">{c.messageCount} replies</span><Link href={`/dashboard/follow-ups/${c.id}`} className="button secondary">Open conversation →</Link></div>
    </article>)}</div>
    <div className={styles.pagination}>{page > 1 ? <Link href={`?page=${page - 1}`} className="button secondary">Previous</Link> : null}{items.length > 20 ? <Link href={`?page=${page + 1}`} className="button secondary">Next</Link> : null}</div>
    </div>
  </DashboardShell>;
}
