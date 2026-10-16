import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAccount } from '@/lib/auth';
import { db } from '@/lib/db';
import { DashboardShell } from '@/components/DashboardShell';
import { Picker } from '@/components/ui/Picker';
import { DatePicker } from '@/components/ui/DatePicker';
import { parseQuestions } from '@/lib/form-policy.mjs';
import { insightRange, ratingSummary } from '@/lib/insight-policy.mjs';
import type { FormQuestion } from '@/lib/form-templates';
import type { Prisma } from '@/generated/prisma';
import styles from './insights.module.css';
import { EntryReview } from '@/components/forms/EntryReview';
import { feedbackTrend } from '@/lib/feedback-insights';
import { reviewFilters, reviewScope } from '@/lib/feedback-review-policy.mjs';
import { ReviewFilters } from '@/components/forms/ReviewFilters';

export default async function FormInsights({ params, searchParams }: { params: Promise<{id:string}>; searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const a = await requireAccount();
  const { id } = await params;
  const raw = await searchParams;
  const value = (key:string) => typeof raw[key] === 'string' ? raw[key] as string : '';
  const form = await db().feedbackForm.findFirst({ where:{ id, accountId:a.id }, select:{title:true,questions:true} });
  if (!form) notFound();
  let range;
  try { range = insightRange(raw); } catch {
    return <DashboardShell accountId={a.id} name={a.displayName} section="forms"><h1>Check your date range</h1><p>Enter real dates as YYYY-MM-DD, starting before the end, for at most one year.</p><Link className="button" href={`/dashboard/forms/${id}/insights`}>Reset filters</Link></DashboardShell>;
  }
  const questions = parseQuestions(form.questions) as FormQuestion[];
  const query = value('q').trim().slice(0,200);
  const review = reviewFilters(raw);
  const selected = questions.find(q=>q.id===value('question'));
  const answer = value('answer').slice(0,240);
  const validDrill = selected && ((selected.type==='RATING' && /^[1-5]$/.test(answer)) || (selected.type==='CHOICE' && selected.options.includes(answer)));
  const entryWhere: Prisma.FeedbackEntryWhereInput = { formId:id, form:{accountId:a.id}, createdAt:{gte:range.start,lt:range.end}, AND:[
    ...reviewScope(review),
    ...(query ? [{answers:{some:{textValue:{contains:query.replace(/[\\%_]/g,'\\$&')}}}}] : []),
    ...(validDrill ? [{answers:{some:{questionId:selected!.id,...(selected!.type==='RATING'?{numberValue:Number(answer)}:{textValue:answer})}}}] : []),
  ] };
  const total = await db().feedbackEntry.count({where:entryWhere});
  const pages = Math.max(1,Math.ceil(total/20));
  const page = Math.min(pages,Math.max(1,Math.floor(Number(value('page'))||1)));
  const entries = await db().feedbackEntry.findMany({where:entryWhere, include:{answers:true,review:true},orderBy:[{createdAt:'desc'},{id:'desc'}],take:20,skip:(page-1)*20});
  const ratings = await db().feedbackAnswer.groupBy({by:['questionId','numberValue'],where:{entry:entryWhere,type:'RATING'},_count:{_all:true}});
  const choices = await db().feedbackAnswer.groupBy({by:['questionId','textValue'],where:{entry:entryWhere,type:'CHOICE'},_count:{_all:true}});
  const counts = await db().feedbackAnswer.groupBy({by:['questionId'],where:{entry:entryWhere},_count:{_all:true}});
  const followups = await db().followupConversation.count({where:{accountId:a.id,entry:{is:entryWhere}}});
  const latest = (await db().feedbackEntry.aggregate({where:entryWhere,_max:{createdAt:true}}))._max.createdAt;
  const trend = await feedbackTrend(a.id,id,range.start,range.end,range.timezone,query,validDrill?{questionId:selected!.id,...(selected!.type==='RATING'?{rating:Number(answer)}:{choice:answer})}:undefined,review);
  const previous = await db().feedbackEntry.count({where:{...entryWhere,createdAt:{gte:new Date(range.start.getTime()-(range.end.getTime()-range.start.getTime())),lt:range.start}}});
  const trendMax = Math.max(1,...trend.map(d=>d.count));
  const points = trend.map((d,i)=>`${12+i*576/Math.max(1,trend.length-1)},${148-d.count*130/trendMax}`).join(' ');
  const href = (extra:Record<string,string>, clear=false) => {
    const p = new URLSearchParams({from:range.from,to:range.to,timezone:range.timezone,...review,...(query?{q:query}:{}),...(!clear&&validDrill?{question:selected!.id,answer}:{}),...extra});
    return `/dashboard/forms/${id}/insights?${p}`;
  };
  const date = (d:Date) => new Intl.DateTimeFormat('en-GB',{timeZone:range.timezone,dateStyle:'medium',timeStyle:'short'}).format(d);
  return <DashboardShell accountId={a.id} name={a.displayName} section="forms">
    <Link href={`/dashboard/forms/${id}`}>← Form & sharing controls</Link>
    <header className={styles.heading}><div><span className="eyebrow">FEEDBACK INSIGHTS</span><h1>{form.title}</h1><p>Understand the pattern. Read the context. Decide what to do next.</p></div></header>
    <form key={JSON.stringify({range,review,query})} className={`panel ${styles.filters}`} method="get">
      <DatePicker name="from" label="From" defaultValue={range.from} required />
      <DatePicker name="to" label="Through" defaultValue={range.to} required />
      <Picker name="timezone" label="Reporting timezone" defaultValue={range.timezone} options={[{value:'UTC',label:'UTC'},{value:'Europe/London',label:'UK local time'}]} />
      <label>Search written answers<input name="q" defaultValue={query} maxLength={200} placeholder="A word or phrase" /></label>
      <ReviewFilters filters={review} />
      <button className="button" type="submit">Apply filters</button>
    </form>
    {validDrill && <p className="notice">Showing submissions answering “{answer}” to “{selected!.label}”. <Link href={href({},true)}>Clear answer filter</Link></p>}
    <div className={styles.stats}>
      <div className={styles.stat}><span>Matching submissions</span><strong>{total.toLocaleString('en-GB')}</strong><small>Retained submissions, not unique people</small></div>
      <div className={styles.stat}><span>Follow-up opt-ins</span><strong>{followups}</strong><small>Within the same filters</small></div>
      <div className={styles.stat}><span>Latest matching response</span><strong style={{fontSize:'1.1rem'}}>{latest ? date(latest) : 'No responses'}</strong><small>{range.timezone}</small></div>
    </div>
    <p className="fine">Percentages use answers to each question, not all submissions. Skipped answers are shown separately. Small samples describe these responses, not your whole audience.</p>
    <section className={styles.question}><h2>Responses over time</h2><p>{total} in this period · {previous} in the previous equal-length period{previous>0?` · ${Math.round((total-previous)/previous*100)}% change`:''}</p>
      <svg viewBox="0 0 600 165" role="img" aria-label={`Daily form submissions from ${range.from} through ${range.to}. Highest daily count: ${trendMax}.`} style={{width:'100%',height:'auto',maxHeight:220}}><line x1="12" y1="148" x2="588" y2="148" stroke="var(--line)" /><polyline fill="none" stroke="var(--indigo)" strokeWidth="3" points={points} /></svg>
      <p className="fine">{range.from} → {range.to} · Daily counts in {range.timezone}. This is submission volume, not a completion rate.</p>
      <details><summary>View daily counts</summary><div style={{maxHeight:240,overflowY:'auto'}}>{trend.map(day=><p key={day.day}><Link href={href({from:day.day,to:day.day,page:'1'})}>{day.day}</Link> · {day.count}</p>)}</div></details>
    </section>
    <section className={styles.questions} aria-label="Question insights">{questions.map(q=>{
      const count = counts.find(c=>c.questionId===q.id)?._count._all||0;
      const summary = ratingSummary(ratings.filter(r=>r.questionId===q.id).map(r=>({value:r.numberValue,count:r._count._all})));
      const bars = q.type==='RATING' ? summary.counts.map(b=>({label:String(b.value),count:b.count})) : q.type==='CHOICE' ? q.options.map(label=>({label,count:choices.find(c=>c.questionId===q.id&&c.textValue===label)?._count._all||0})) : [];
      return <article className={styles.question} key={q.id}><span className="eyebrow">{q.type==='TEXT'?'WRITTEN ANSWERS':q.type}</span><h2>{q.label}</h2>
        {q.type==='RATING' && <p>Average {summary.average?.toFixed(1)??'—'} / 5 · Median {summary.median??'—'}</p>}
        {bars.map(b=><Link className={styles.bar} key={b.label} href={href({question:q.id,answer:b.label,page:'1'},true)} aria-label={`Filter to ${b.label}: ${b.count} answers`}><span>{b.label}</span><span>{b.count} · {count?Math.round(b.count/count*100):0}%</span><span className={styles.track}><span className={styles.fill} style={{width:`${count?b.count/count*100:0}%`}} /></span></Link>)}
        <p className="fine">{count} answered · {Math.max(0,total-count)} skipped</p>
      </article>;
    })}</section>
    <section><h2>Read the responses</h2><p className="fine">The same filters apply here. With Pro, you can also export responses for private analysis; public sharing requires separate permission.</p>
      {!entries.length && <div className="panel"><p>No submissions match these filters.</p></div>}
      {entries.map(e=><article className={styles.response} key={e.id}><time dateTime={e.createdAt.toISOString()}>{date(e.createdAt)}</time><span className="fine"> · {e.shareAllowed?'Sender permits sharing; form restrictions still apply':'Private-only'}</span>{questions.map(q=>{const answer=e.answers.find(x=>x.questionId===q.id);return <div key={q.id}><h3>{q.label}</h3><p>{answer?(answer.type==='RATING'?`${answer.numberValue} / 5`:answer.textValue):'Skipped'}</p></div>;})}<EntryReview entryId={e.id} review={e.review} /></article>)}
      <nav className={styles.nav} aria-label="Response pages">{page>1&&<Link className="button secondary" href={href({page:String(page-1)})}>Previous</Link>}<span>Page {page} of {pages}</span>{page<pages&&<Link className="button secondary" href={href({page:String(page+1)})}>Next</Link>}</nav>
    </section>
  </DashboardShell>;
}
