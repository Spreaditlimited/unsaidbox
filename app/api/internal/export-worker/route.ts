import { timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';
import { cleanExpiredExports, processExport } from '@/lib/export-jobs';
export const maxDuration=300;
export const dynamic='force-dynamic';
export async function POST(request:Request){
  const secret=process.env.UNSAIDBOX_EXPORT_WORKER_SECRET;
  const received=request.headers.get('authorization')||'';
  const expected=secret?`Bearer ${secret}`:'';
  if(!secret||secret.length<32||Buffer.byteLength(received)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(received),Buffer.from(expected)))return new Response('Unauthorized',{status:401});
  try{
    await cleanExpiredExports();
    const now=new Date();
    const job=await db().exportJob.findFirst({where:{revokedAt:null,expiresAt:{gt:now},attempts:{lt:3},nextAttemptAt:{lte:now},OR:[{status:'QUEUED'},{status:'FAILED'},{status:'RUNNING',lockedUntil:{lt:now}}]},orderBy:{createdAt:'asc'},select:{id:true,accountId:true}});
    if(job)await processExport(job.id,job.accountId);
    return Response.json({ok:true,attempted:job?1:0},{headers:{'Cache-Control':'no-store'}});
  }catch{console.warn('export_worker_request_failed');return Response.json({error:'Worker unavailable'},{status:503});}
}
