import Link from 'next/link';
import { requireAccount } from '@/lib/auth';
import { accountPlan } from '@/lib/plans';
import { db } from '@/lib/db';
import { DashboardShell } from '@/components/DashboardShell';
import { ActionForm } from '@/components/ActionForm';
import { Checkbox } from '@/components/ui/Checkbox';
import { Picker } from '@/components/ui/Picker';
import { DatePicker } from '@/components/ui/DatePicker';
import { parseExportFilters, exportColumns } from '@/lib/export-policy.mjs';
import { exportCounts } from '@/lib/export-data';
import { createExport, retryExport, revokeExport, saveExportPreset, deleteExportPreset } from './actions';
import styles from './exports.module.css';
import { ReviewFilters } from '@/components/forms/ReviewFilters';
import { ExportProgress } from '@/components/ExportProgress';
export const maxDuration=300;

const columnLabels: Record<string, [string, string]> = {
  recordId: ['Record ID', 'Unique answer reference'],
  entryId: ['Submission ID', 'Groups answers from one form'],
  received: ['Date received', 'In your selected timezone'],
  sourceId: ['Collection ID', 'Question or form reference'],
  sourceTitle: ['Collection title', 'Name of the question or form'],
  questionId: ['Question ID', 'Individual question reference'],
  question: ['Question text', 'What your audience answered'],
  response: ['Response', 'The answer itself'],
};

function Columns({selected}:{selected:string[]}) {
  return <fieldset className={styles.columnSet}><legend>Include in your CSV</legend><div className={styles.columns}>
    {exportColumns.map(column=><Checkbox className={styles.column} key={column} name="columns" value={column} defaultChecked={selected.includes(column)}><strong>{columnLabels[column][0]}</strong><small>{columnLabels[column][1]}</small></Checkbox>)}
  </div></fieldset>;
}

function FilterValues({filters}:{filters:ReturnType<typeof parseExportFilters>}) {
  return <>{Object.entries(filters).filter(([key])=>key!=='columns').map(([key,value])=><input key={key} type="hidden" name={key} value={String(value)} />)}</>;
}

export default async function ExportCentre({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const a=await requireAccount();
  const plan=await accountPlan(a.id);
  if(!plan.enforced||!plan.limits.csv)return <DashboardShell accountId={a.id} name={a.displayName} section="exports"><h1>Your export centre</h1><p>Filter and download responses for private analysis with Pro. Public sharing remains subject to the sender’s sharing permission.</p><Link className="button" href="/dashboard/billing#upgrade-pro">Explore Pro →</Link></DashboardShell>;
  const raw=await searchParams;
  const presets=await db().exportPreset.findMany({where:{accountId:a.id},orderBy:{updatedAt:'desc'},take:30});
  const preset=typeof raw.preset==='string'?presets.find(p=>p.id===raw.preset):null;
  let filters,error='';
  try{filters=parseExportFilters(preset?preset.filters:{source:'messages',purpose:'ANALYSIS',...raw});}catch(e){error=(e as Error).message;filters=parseExportFilters({source:'messages',purpose:'ANALYSIS'});}
  const links=filters.source==='forms'?await db().feedbackForm.findMany({where:{accountId:a.id},select:{id:true,title:true},orderBy:{createdAt:'desc'},take:100}):await db().question.findMany({where:{accountId:a.id},select:{id:true,body:true},orderBy:{createdAt:'desc'},take:100});
  const options=[{value:'all',label:'All collection links'},...links.map(l=>({value:l.id,label:('title'in l?l.title:l.body).slice(0,100)}))];
  const counts=error?null:await exportCounts(a.id,filters,new Date());
  const jobs=await db().exportJob.findMany({where:{accountId:a.id},orderBy:{createdAt:'desc'},take:20,select:{id:true,status:true,createdAt:true,expiresAt:true,outputRows:true,eligibleRecords:true,excludedRecords:true,processedRecords:true,fileName:true,lastErrorCode:true,attempts:true}});
  const now=new Date();
  const formatDate=(date:Date)=>new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:filters.timezone}).format(date);
  return <DashboardShell accountId={a.id} name={a.displayName} section="exports"><div className={styles.page}>
    <header className={styles.heading}><div><span className="eyebrow">YOUR DATA, CLEARLY ORGANISED</span><h1>Export centre</h1><p>Turn the responses you collect into something you can work with.</p></div><a className="button secondary" href="#recent-exports">Your downloads ↓</a></header>
    <div className={styles.privacy}><span className={styles.privacyIcon} aria-hidden="true">↳</span><div><strong>Your responses. Your private workspace.</strong><p>Analyse new and existing responses without a separate sender opt-in. Public sharing still requires permission; private follow-up conversations are never included.</p></div></div>
    {error&&<p role="alert" className="notice">{error}</p>}
    <section className={styles.surface} aria-labelledby="filter-heading">
      <div className={styles.sectionHeading}><span className={styles.step}>01</span><div><h2 id="filter-heading">Choose your responses</h2><p>Select a source, then narrow down what you need.</p></div></div>
      <nav className={styles.sources} aria-label="Export source"><Link aria-current={filters.source==='messages'?'page':undefined} href="/dashboard/exports?source=messages"><strong>Messages & answers</strong><span>Your inbox and question responses</span></Link><Link aria-current={filters.source==='forms'?'page':undefined} href="/dashboard/exports?source=forms"><strong>Feedback forms</strong><span>Completed forms and their answers</span></Link></nav>
      <form key={JSON.stringify(filters)} className={styles.filterForm} method="get">
        <input type="hidden" name="source" value={filters.source} />
        {filters.columns.map(column=><input key={column} type="hidden" name="columns" value={column} />)}
        <div className={styles.filterGrid}>
          <Picker name="purpose" label="How will you use this?" defaultValue={filters.purpose} options={[{value:'ANALYSIS',label:'Private analysis'},{value:'SHARING',label:'Reviewed responses for sharing'}]} />
          <Picker name="sourceId" label="Collection link" defaultValue={filters.sourceId||'all'} options={options} />
          <Picker name="layout" label="File layout" defaultValue={filters.layout} options={filters.source==='forms'?[{value:'LONG',label:'One answer per row'},{value:'WIDE',label:'One submission per row'}]:[{value:'LONG',label:'One answer per row'}]} />
        </div>
        <div className={styles.filterGrid}>
          <DatePicker name="from" label="From" defaultValue={filters.from} required />
          <DatePicker name="to" label="Through" defaultValue={filters.to} required />
          <Picker name="timezone" label="Timezone" defaultValue={filters.timezone} options={[{value:'UTC',label:'UTC'},{value:'Europe/London',label:'UK local time'}]} />
        </div>
        <p className={styles.hint}>Choose dates using the calendars. Collection choices show your latest 100 links.{filters.source==='forms'?' For one submission per row, select a single form.':''}</p>
        <label>Search within responses<input name="q" defaultValue={filters.q} maxLength={200} placeholder="A word or phrase, such as course pacing" /></label>
        {filters.source==='forms'&&<details className={styles.advanced} open={!!(filters.reviewStatus||filters.starred||filters.tag)}><summary>Review status, stars & tags</summary><div className={styles.filterGrid}><ReviewFilters filters={filters} /></div></details>}
        <div className={styles.filterFooter}><span>Preview updates the counts below. It won’t create a file.</span><button className="button">Preview responses →</button></div>
      </form>
    </section>
    {counts&&<>
      <dl className={styles.stats} aria-label="Export preview"><div><dt>Matching your filters</dt><dd>{counts.matchingRecords.toLocaleString('en-GB')}</dd><p>{filters.source==='forms'?'Completed form submissions':'Messages & question answers'}</p></div><div><dt>Ready to include</dt><dd>{counts.eligibleRecords.toLocaleString('en-GB')}</dd><p>Available for this export purpose</p></div><div><dt>Not included</dt><dd>{counts.excludedRecords.toLocaleString('en-GB')}</dd><p>{filters.purpose==='ANALYSIS'?'Spam or blocked collections':'Review or sharing restrictions'}</p></div></dl>
      <div className={styles.prepareGrid}><section className={styles.surface} aria-labelledby="download-heading">
        <div className={styles.sectionHeading}><span className={styles.step}>02</span><div><h2 id="download-heading">Make the file yours</h2><p>{filters.layout==='LONG'?'Choose the details you want in your spreadsheet.':'Each completed submission becomes one row, with a column for every question.'}</p></div></div>
        {counts.eligibleRecords>0?<ActionForm key={JSON.stringify(filters)} action={createExport} captchaAction="createExport" label="Prepare CSV download">
          <FilterValues filters={filters} />
          {filters.layout==='LONG'?<Columns selected={filters.columns} />:<><p className={styles.hint}>Submission ID, date received and all form questions are included automatically.</p>{exportColumns.map(column=><input key={column} type="hidden" name="columns" value={column} />)}</>}
          <p className={styles.hint}>Based on the preview above. Changed filters must be previewed before preparing your file.</p>
        </ActionForm>:<div className={styles.empty}><h3>No responses to export yet</h3><p>Try a wider date range, another collection or fewer filters, then preview again.</p></div>}
      </section><aside className={styles.guide} aria-label="Download information"><span className="eyebrow">GOOD TO KNOW</span><h2>A complete file.<br />No manual batches.</h2><ul><li><strong>No monthly export allowance</strong><span>Export when you need to. Request-rate safeguards still apply.</span></li><li><strong>Available for 24 hours</strong><span>Download your file from the history below before it expires.</span></li><li><strong>Up to 25 MB per file</strong><span>For large collections, use a narrower date range.</span></li></ul><p>Keep private-analysis files private. Downloading a response does not give permission to publish it.</p></aside></div>
      <details className={`${styles.surface} ${styles.savePreset}`}><summary>Use these filters again <span>Save a preset</span></summary><p>Save this date range and filter selection. Dates are fixed, not rolling.</p><ActionForm key={JSON.stringify(filters)} action={saveExportPreset} captchaAction="saveExportPreset" label="Save preset"><label>Preset name<input name="name" required maxLength={100} placeholder="October course feedback" /></label><FilterValues filters={filters} /><Columns selected={filters.columns} /></ActionForm></details>
    </>}
    {presets.length>0&&<section className={styles.surface}><div className={styles.sectionHeading}><div><h2>Saved presets</h2><p>A familiar starting point for your next export.</p></div></div><div className={styles.presetGrid}>{presets.map(p=><div className={styles.preset} key={p.id}><Link href={`/dashboard/exports?preset=${p.id}`}>{p.name} <span aria-hidden="true">↗</span></Link><details><summary>Manage preset</summary><ActionForm action={deleteExportPreset.bind(null,p.id)} captchaAction="deleteExportPreset" label="Remove preset"><span className="fine">Only the saved configuration is removed.</span></ActionForm></details></div>)}</div></section>}
    <section id="recent-exports" className={styles.history} aria-labelledby="history-heading"><div className={styles.historyHeading}><div><span className="eyebrow">READY WHEN YOU ARE</span><h2 id="history-heading">Your downloads</h2></div><ExportProgress pending={jobs.some(j=>['QUEUED','RUNNING'].includes(j.status)&&!!j.expiresAt&&j.expiresAt>now)} /></div>
      {!jobs.length&&<div className={`${styles.surface} ${styles.empty}`}><span className={styles.fileIcon} aria-hidden="true">CSV</span><h3>Your first download starts above</h3><p>Prepare an export and it will appear here, with its progress and download link.</p></div>}
      {jobs.map(job=>{
        const expired=!!job.expiresAt&&job.expiresAt<=now;
        const status=job.status==='REVOKED'?'REVOKED':expired?'EXPIRED':job.status;
        const ready=status==='READY';
        return <article className={styles.job} key={job.id}><div className={styles.jobTop}><span className={styles.fileIcon} aria-hidden="true">CSV</span><div className={styles.jobTitle}><h3>{job.fileName||'Response export'}</h3><p>Created {formatDate(job.createdAt)} · {filters.timezone==='UTC'?'UTC':'UK time'}</p></div><span className={styles.status} data-status={status}>{({READY:'Ready to download',QUEUED:'Queued',RUNNING:'Preparing',FAILED:'Needs attention',EXPIRED:'Expired',REVOKED:'Access revoked'} as Record<string,string>)[status]||status}</span></div>
          <div className={styles.jobMeta}><span><strong>{job.processedRecords.toLocaleString('en-GB')}</strong> records processed</span><span><strong>{job.outputRows.toLocaleString('en-GB')}</strong> CSV rows</span>{ready&&job.expiresAt&&<span>Available until {formatDate(job.expiresAt)}</span>}</div>
          {status==='FAILED'&&job.lastErrorCode&&<p role="status" className={styles.jobError}>Preparation issue: {job.lastErrorCode.replaceAll('_',' ').toLowerCase()}. Try a narrower date range for large exports.</p>}
          {!['REVOKED','EXPIRED'].includes(status)&&<div className={styles.jobActions}>{ready&&<a className="button" href={`/api/exports/${job.id}`}>Download CSV ↓</a>}<details><summary>Manage download</summary><div className={styles.management}>{['QUEUED','RUNNING','FAILED'].includes(status)&&job.attempts<3&&<ActionForm action={retryExport.bind(null,job.id)} captchaAction="retryExport" label="Retry preparation"><span className="fine">Only restarts if no worker currently holds this job.</span></ActionForm>}<ActionForm action={revokeExport.bind(null,job.id)} captchaAction="revokeExport" label="Revoke download"><span className="fine">Downloaded copies cannot be recalled.</span></ActionForm></div></details></div>}
        </article>;
      })}
    </section>
  </div></DashboardShell>;
}
