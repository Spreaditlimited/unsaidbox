import 'server-only';
import { db } from './db';
import { Prisma } from '@/generated/prisma';

export async function feedbackTrend(accountId:string,formId:string,start:Date,end:Date,timezone:string,q:string,drill?:{questionId:string;rating?:number;choice?:string},review?:{reviewStatus:string;starred:string;tag:string}){
  const text=q?Prisma.sql`AND EXISTS (SELECT 1 FROM FeedbackAnswer a WHERE a.entryId=e.id AND a.textValue LIKE ${'%'+q.replace(/[\\%_]/g,'\\$&')+'%'})`:Prisma.empty;
  const selection=drill?Prisma.sql`AND EXISTS (SELECT 1 FROM FeedbackAnswer a WHERE a.entryId=e.id AND a.questionId=${drill.questionId} AND ${drill.rating!==undefined?Prisma.sql`a.numberValue=${drill.rating}`:Prisma.sql`a.textValue=${drill.choice}`})`:Prisma.empty;
  const status=review?.reviewStatus?Prisma.sql`AND COALESCE(r.status,'NEW')=${review.reviewStatus}`:Prisma.empty;
  const star=review?.starred?Prisma.sql`AND COALESCE(r.starred,0)=${review.starred==='yes'?1:0}`:Prisma.empty;
  const tag=review?.tag?Prisma.sql`AND JSON_CONTAINS(r.tags,${JSON.stringify(review.tag)})=1`:Prisma.empty;
  const hours=await db().$queryRaw<{hour:string;n:bigint}[]>(Prisma.sql`SELECT DATE_FORMAT(e.createdAt,'%Y-%m-%dT%H:00:00Z') AS hour, COUNT(*) AS n FROM FeedbackEntry e INNER JOIN FeedbackForm f ON f.id=e.formId LEFT JOIN FeedbackEntryReview r ON r.entryId=e.id WHERE f.accountId=${accountId} AND e.formId=${formId} AND e.createdAt>=${start} AND e.createdAt<${end} ${text} ${selection} ${status} ${star} ${tag} GROUP BY hour ORDER BY hour`);
  const format=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'});
  const label=(date:Date)=>{const p=Object.fromEntries(format.formatToParts(date).map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}`;};
  const buckets=new Map<string,number>();
  for(const h of hours){const key=label(new Date(h.hour));buckets.set(key,(buckets.get(key)||0)+Number(h.n));}
  const result:{day:string;count:number}[]=[];
  const cursor=new Date(label(start)+'T00:00:00Z');
  const last=label(new Date(end.getTime()-1));
  for(let i=0;i<368&&cursor.toISOString().slice(0,10)<=last;i++,cursor.setUTCDate(cursor.getUTCDate()+1)){
    const day=cursor.toISOString().slice(0,10);result.push({day,count:buckets.get(day)||0});
  }
  return result;
}
