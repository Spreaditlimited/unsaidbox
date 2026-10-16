import {ThemePicker} from "@/components/ThemePicker";
import Link from 'next/link';
import { senderConversation } from '@/lib/followups';
import { db } from '@/lib/db';
import { FollowupThread } from '@/components/FollowupThread';
import styles from '@/components/FollowupThread.module.css';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Private conversation', robots: { index: false, follow: false } };
export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await senderConversation(id);
  if (!c) return <main id="main" className="sender-shell"><section className={`sender-card ${styles.publicCard}`}><div className="standalone-appearance"><ThemePicker/></div><h1>Private conversation unavailable.</h1><p>Open your saved return link. It may have expired, been removed, or become unavailable.</p><Link href="/safety">Privacy & safety</Link></section></main>;
  const messages = await db().followupMessage.findMany({ where: { conversationId: id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 100 });
  const original = c.submission?.body ?? c.entry?.answers.map(a => `${a.label}\n${a.textValue ?? a.numberValue ?? ''}`).join('\n\n') ?? '';
  return <main id="main" className="sender-shell"><section className={`sender-card ${styles.publicCard}`}><div className="standalone-appearance"><ThemePicker/></div>
    <p className="eyebrow">WITH @{c.account.username}</p><h1>A private follow-up.</h1>
    <a href={`/follow-up/${id}`} className="button secondary">Check for new replies</a>
    <FollowupThread id={id} owner={false} original={original} messages={messages} closed={Boolean(c.closedAt) || c.messageCount >= 100} expiresAt={c.expiresAt} />
  </section></main>;
}
