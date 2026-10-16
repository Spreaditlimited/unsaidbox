import 'server-only';
import { createHash } from 'node:crypto';
import { db } from './db';
import { exportScope, parseExportFilters } from './export-policy.mjs';
import { csvDocument, csvCell } from './plan-policy.mjs';
import { parseQuestions } from './form-policy.mjs';
import type { FormQuestion } from './form-templates';
import type { Prisma } from '@/generated/prisma';

export type ExportFilters = ReturnType<typeof parseExportFilters>;
export async function exportCounts(accountId:string, filters:ExportFilters, snapshotAt:Date) {
  const matching = exportScope(accountId,filters,snapshotAt,false);
  const eligible = exportScope(accountId,filters,snapshotAt,true);
  const all = filters.source==='messages' ? await db().submission.count({where:matching as Prisma.SubmissionWhereInput}) : await db().feedbackEntry.count({where:matching as Prisma.FeedbackEntryWhereInput});
  const allowed = filters.source==='messages' ? await db().submission.count({where:eligible as Prisma.SubmissionWhereInput}) : await db().feedbackEntry.count({where:eligible as Prisma.FeedbackEntryWhereInput});
  return { matchingRecords:all,eligibleRecords:allowed,excludedRecords:Math.max(0,all-allowed) };
}
// Bounded batches, not a 200-row user-facing limit. Follow-ups are never queried.
export async function collectExport(accountId:string, filters:ExportFilters, snapshotAt:Date, content=true, heartbeat?: (records:number)=>Promise<void>) {
  let cursor='', records=0, rows=0, size=0;
  const chunks:Buffer[]=[];
  const fingerprint=createHash('sha256');
  const deadline=Date.now()+180000;
  const append=(line:string)=>{ if(!content)return;size+=Buffer.byteLength(line);if(size>25*1024*1024)throw new Error('EXPORT_TOO_LARGE');chunks.push(Buffer.from(line)); };
  let questions:FormQuestion[]=[];
  if(filters.layout==='WIDE'){
    const f=await db().feedbackForm.findFirst({where:{id:filters.sourceId,accountId},select:{questions:true}});
    if(!f)throw new Error('EXPORT_SOURCE_MISSING');
    questions=parseQuestions(f.questions) as FormQuestion[];
    append(csvDocument([['Entry ID','Received ('+filters.timezone+')',...questions.map(q=>q.label+' ['+q.id+']')]]));
  }else append(csvDocument([filters.columns]));
  const received=(date:Date)=>filters.timezone==='UTC'?date.toISOString():new Intl.DateTimeFormat('en-GB',{timeZone:filters.timezone,dateStyle:'short',timeStyle:'long'}).format(date);
  const line=(row:Record<string,string>)=>{append(filters.columns.map(c=>csvCell(row[c]??'')).join(',')+'\r\n');rows++;};
  for(;;){
    if(Date.now()>deadline)throw new Error('EXPORT_TIME_LIMIT');
    const scope=exportScope(accountId,filters,snapshotAt,true);
    if(filters.source==='messages'){
      const batch=await db().submission.findMany({where:{AND:[scope as Prisma.SubmissionWhereInput,...(cursor?[{id:{gt:cursor}}]:[])]},orderBy:{id:'asc'},take:100,select:{id:true,createdAt:true,updatedAt:true,questionId:true,publicBody:content,body:content,question:content?{select:{body:true}}:false}});
      if(!batch.length)break;
      for(const e of batch){
        fingerprint.update(e.id+':'+e.updatedAt.toISOString()+'\n');
        if(content)line({recordId:e.id,entryId:'',received:received(e.createdAt),sourceId:e.questionId??'',sourceTitle:e.question?.body??'Inbox',questionId:e.questionId??'',question:e.question?.body??'Inbox message',response:e.publicBody??e.body??''});
      }
      cursor=batch[batch.length-1].id;records+=batch.length;
    }else{
      const batch=await db().feedbackEntry.findMany({where:{AND:[scope as Prisma.FeedbackEntryWhereInput,...(cursor?[{id:{gt:cursor}}]:[])]},orderBy:{id:'asc'},take:100,include:{form:{select:{id:true,title:true,updatedAt:true}},answers:content?{orderBy:{questionId:'asc'}}:false}});
      if(!batch.length)break;
      for(const e of batch){
        fingerprint.update(JSON.stringify([e.id,e.form.id,e.form.title])+'\n');
        if(content && filters.layout==='WIDE'){append([e.id,received(e.createdAt),...questions.map(q=>{const a=e.answers.find(a=>a.questionId===q.id);return a?(a.textValue??String(a.numberValue??'')):'';})].map(csvCell).join(',')+'\r\n');rows++;}
        else if(content)for(const a of e.answers)line({recordId:a.id,entryId:e.id,received:received(e.createdAt),sourceId:e.form.id,sourceTitle:e.form.title,questionId:a.questionId,question:a.label,response:a.textValue??String(a.numberValue??'')});
      }
      cursor=batch[batch.length-1].id;records+=batch.length;
    }
    if(heartbeat)await heartbeat(records);
  }
  return {bytes:content?Buffer.concat(chunks):null,fingerprint:fingerprint.digest('hex'),records,rows};
}
