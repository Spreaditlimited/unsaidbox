import { randomUUID } from 'node:crypto';
import { ActionForm } from './ActionForm';
import { replyFollowup, closeFollowup, reportFollowup } from '@/app/follow-up/actions';
import styles from './FollowupThread.module.css';

type Message = { id: string; author: string; body: string; createdAt: Date };
export function FollowupThread({ id, owner, messages, original, closed, expiresAt }: {
  id: string; owner: boolean; messages: Message[]; original: string; closed: boolean; expiresAt: Date;
}) {
  return <section className={styles.thread}>
    <div className={styles.notice}><strong>Private means private.</strong><p>These replies never appear on a public page or share card. Do not ask for or include identifying details. Return here to check for new replies; this is not live chat.</p></div>
    <details className={styles.original}><summary>Original response</summary><p>{original}</p></details>
    <ol className={styles.messages} aria-label="Private replies">
      {messages.map(m => <li key={m.id} className={m.author === 'OWNER' ? styles.owner : styles.sender}>
        <div className={styles.meta}><strong>{m.author === 'OWNER' ? (owner ? 'You · box owner' : 'Box owner') : (owner ? 'Anonymous sender' : 'You · anonymous')}</strong>
          <time dateTime={m.createdAt.toISOString()}>{m.createdAt.toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} UTC</time></div>
        <p>{m.body}</p>
      </li>)}
    </ol>
    {!messages.length ? <p className={styles.empty}>A little room to understand each other. {owner ? 'Ask a thoughtful follow-up or send a private thank-you.' : 'No replies yet. The owner may reply when they return.'}</p> : null}
    {closed ? <p className="notice">This conversation is closed to new replies.</p> : <ActionForm action={replyFollowup.bind(null, id, owner)} label="Send private reply" captchaAction="replyFollowup">
      <input type="hidden" name="requestKey" value={randomUUID()} />
      <label>Your private reply<textarea name="body" required maxLength={3000} rows={4} placeholder="Keep the conversation thoughtful…" /></label>
      <p className="fine">Up to 3,000 characters. Follow-up replies do not use the owner’s monthly response allowance.</p>
    </ActionForm>}
    <div className={styles.footer}><p className="fine">Return access expires {expiresAt.toLocaleDateString('en-GB', { timeZone: 'UTC' })}. Up to 100 replies per conversation.</p>
      {!closed ? <details><summary>End this conversation</summary><p>Closing prevents either side from replying. It cannot be reopened.</p><ActionForm action={closeFollowup.bind(null, id, owner)} label="Close conversation" captchaAction="closeFollowup"><span className="fine">Existing replies remain saved.</span></ActionForm></details> : null}
      {!owner ? <details><summary>Report a concern</summary><ActionForm action={reportFollowup.bind(null, id)} label="Report and close conversation" captchaAction="reportFollowup"><label>What happened?<textarea name="reason" required minLength={10} maxLength={700} rows={3} /></label><p className="fine">Your report goes to UnsaidBox administrators, not the box owner.</p></ActionForm></details> : null}
    </div>
  </section>;
}
