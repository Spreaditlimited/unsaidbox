import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAccount } from '@/lib/auth';
import { followupRelations } from '@/lib/followups';
import { followupAvailable } from '@/lib/followup-policy.mjs';
import { DashboardShell } from '@/components/DashboardShell';
import { FollowupThread } from '@/components/FollowupThread';
import styles from '../followups.module.css';
export default async function OwnerConversation({ params }: { params: Promise<{ id: string }> }) {
  const a = await requireAccount();
  const { id } = await params;
  const c = await db().followupConversation.findFirst({ where: { id, accountId: a.id }, include: { ...followupRelations, messages: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 100 } } });
  if (!c) notFound();
  const original = c.submission?.body ?? c.entry?.answers.map(v => `${v.label}\n${v.textValue ?? v.numberValue ?? ''}`).join('\n\n') ?? '';
  return <DashboardShell accountId={a.id} name={a.displayName} section="followups">
    <div className={`${styles.page} ${styles.conversation}`}><header className={styles.header}>
    <Link href="/dashboard/follow-ups" className="text-link">← Private follow-ups</Link>
    <h1>Keep listening.</h1><p>The sender chose to allow a private conversation. They return using their secret link; their identity is not shared with you.</p>
    <a href={`/dashboard/follow-ups/${id}`} className="button secondary">Check for new replies</a>
    </header>
    <FollowupThread id={id} owner original={original} messages={c.messages} closed={Boolean(c.closedAt) || c.messageCount >= 100 || !followupAvailable(c)} expiresAt={c.expiresAt} />
    </div>
  </DashboardShell>;
}
