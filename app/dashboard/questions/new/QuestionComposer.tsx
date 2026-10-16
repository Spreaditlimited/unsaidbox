'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { ActionForm } from '@/components/ActionForm';
import { Checkbox } from '@/components/ui/Checkbox';
import { Picker } from '@/components/ui/Picker';
import { Captcha, useCaptcha } from '@/components/Captcha';
import { createQuestion } from '@/app/actions';
import { ideaGoals, ideaTones } from '@/lib/question-ideas-policy.mjs';
import { suggestQuestions } from './ideas-actions';
import styles from './questions.module.css';

export function QuestionComposer({ pro, ready }: { pro: boolean; ready: boolean }) {
  const [body, setBody] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [message, setMessage] = useState('');
  const draft = useRef<HTMLTextAreaElement>(null);
  const suggestions = useRef<HTMLOListElement>(null);
  const secure = useCaptcha();
  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (inFlight.current) return;
    const form = new FormData(event.currentTarget);
    inFlight.current = true; setBusy(true); setMessage('');
    try {
      await secure(form, 'suggestQuestions');
      const result = await suggestQuestions(form);
      if (result.error) setMessage(result.error);
      else if (result.questions) { setQuestions(result.questions); if (suggestions.current) suggestions.current.scrollTop = 0; setMessage('Five ideas ready. Scroll through the suggestions and choose one to edit in your draft—nothing has been created or published.'); }
    } catch { setMessage('Suggestions could not be loaded. Your draft is unchanged.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <div className={styles.layout}>
    <div className={styles.primary}>
      <section className={`panel ${styles.editor}`} aria-labelledby="draft-title">
        <div className={styles.sectionTop}><span className={styles.step}>01 · COMPOSE</span><span className={styles.badge}>Public visibility off</span></div>
        <h2 id="draft-title">What would you like to ask?</h2>
        <p className={styles.description}>Start with your own words, or make an AI suggestion your own.</p>
        <ActionForm action={createQuestion} label="Create answer link" captchaAction="createQuestion">
          <label htmlFor="question-body">Your question</label>
          <textarea id="question-body" ref={draft} name="body" required maxLength={5000} rows={7} value={body} onChange={event => setBody(event.target.value)} placeholder="What’s one thing you wish you could ask without being judged?" aria-describedby="question-hint question-count" />
          <div className={styles.inputMeta}><span id="question-hint">One clear, open-ended question works best.</span><span id="question-count">{body.length.toLocaleString('en-GB')} / 5,000</span></div>
          <div className={styles.privacy}>
            <span className={styles.step}>02 · ANSWER PRIVACY</span>
            <Checkbox name="privateOnly">Promise that answers stay private-only.</Checkbox>
            <p>Choose this if you will never share these answers. This promise cannot be loosened later. Otherwise, you decide which answers to share.</p>
          </div>
          <p className={styles.publishNote}>Your link will accept answers immediately, with public visibility off. No Facebook link is required.</p>
        </ActionForm>
      </section>
      <section className={styles.nextSteps} aria-labelledby="next-title"><h2 id="next-title">What happens next?</h2><ol><li><span>01</span><div><h3>Copy your link</h3><p>Share it in a post, comment or message.</p></div></li><li><span>02</span><div><h3>Receive honest answers</h3><p>Responses arrive in your private dashboard.</p></div></li><li><span>03</span><div><h3>You stay in control</h3><p>Nothing is shared publicly automatically.</p></div></li></ol></section>
    </div>
    <section className={`panel ${styles.ideas}`} aria-labelledby="ideas-title"><div className={styles.heading}><span className={styles.spark} aria-hidden="true">✧</span><div><p className="eyebrow">YOUR CREATIVE ASSISTANT · PRO</p><h2 id="ideas-title">Find your next question</h2><p>Five thoughtful ideas, tailored to your niche.</p></div></div>
      {!pro ? <div className={styles.locked}><p>AI question ideas are included with Pro. You can always write your own question in the editor.</p><Link href="/dashboard/billing#upgrade-pro" className="button secondary">Explore Pro</Link><p className={styles.assistantNote}>You choose the idea. You make it yours. Nothing is published for you.</p></div> : !ready ? <p className="notice">AI suggestions are temporarily unavailable. You can still write your own question, or try again later.</p> : <>
        <form onSubmit={generate} className="app-form"><fieldset disabled={busy}><div className={styles.fields}><label>Your niche<input name="niche" placeholder="e.g. AI tools for small business owners" minLength={3} maxLength={160} required /></label><label>Your audience <span className="fine">(optional)</span><input name="audience" placeholder="e.g. Beginners running their first business" maxLength={240} /></label><Picker name="goal" label="What would you like to learn?" defaultValue={ideaGoals[0]} options={ideaGoals.map(value => ({ value, label: value }))} /><Picker name="tone" label="Tone" defaultValue={ideaTones[0]} options={ideaTones.map(value => ({ value, label: value }))} /></div><Captcha /></fieldset>
          <button id="generate-questions" className="button" disabled={busy}>{busy ? 'Finding thoughtful questions…' : questions.length ? 'Generate five more ideas' : 'Generate five questions'}</button>
          <details className={styles.details}><summary>Privacy & generation limits</summary><p>Only these inputs are sent to OpenAI. Don’t include private or identifying information. Your inbox and responses are never used for this feature.</p><p>Pro includes up to 50 generation attempts a day (UTC), with a limit of 10 per hour. Failed attempts count toward this limit.</p></details>
        </form><p role="status" className={styles.status}>{message}</p>
        {questions.length ? <ol ref={suggestions} className={styles.suggestions} tabIndex={0} aria-label="Generated question ideas — scroll for more">{questions.map((question, index) => <li key={question}><span className={styles.number}>{String(index + 1).padStart(2, '0')}</span><div><p>{question}</p><div className={styles.suggestionActions}><button type="button" className="button secondary small" disabled={busy} onClick={() => { setBody(question); setMessage('Question added to your draft. Edit it and review the privacy setting before creating your link.'); draft.current?.focus(); }}>{body.trim() ? 'Replace current draft' : 'Use this question'}</button><button type="button" className="button secondary small" disabled={busy} aria-label={`Dismiss suggestion ${index + 1}`} onClick={() => {
            const remaining = questions.filter(item => item !== question);
            setQuestions(remaining);
            setMessage(remaining.length ? 'Suggestion dismissed. Your draft is unchanged.' : 'All suggestions dismissed. Generate another set whenever you’re ready. Your draft is unchanged.');
            if (remaining.length) suggestions.current?.focus({ preventScroll: true });
            else document.getElementById('generate-questions')?.focus({ preventScroll: true });
          }}>Dismiss</button></div></div></li>)}</ol> : null}
      </>}
    </section>
  </div>;
}
