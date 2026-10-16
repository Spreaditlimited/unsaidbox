import { requireAccount, rateLimit } from '@/lib/auth';
import { verifiedExportBytes } from '@/lib/export-integrity.mjs';
import { requirePlanFeature } from '@/lib/plans';
import { planMode } from '@/lib/plan-policy.mjs';
import { db } from '@/lib/db';
import { collectExport } from '@/lib/export-data';
import { parseExportFilters } from '@/lib/export-policy.mjs';
import { readExport } from '@/lib/export-storage';
import { unstable_rethrow } from 'next/navigation';
export const maxDuration=300;
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const a=await requireAccount();
  const {id}=await params;
  try{
    await requirePlanFeature(a.id,'csv');
    const job=await db().exportJob.findFirst({where:{id,accountId:a.id,status:'READY',revokedAt:null,expiresAt:{gt:new Date()},policyVersion:`sharing-v1:${planMode()}`}});
    if(!job?.storageKey)return new Response('This export is unavailable or expired.',{status:404,headers});
    await rateLimit(`export-download:${a.id}`,30,3600);
    const filters=parseExportFilters(job.filters);
    const current=await collectExport(a.id,filters,job.snapshotAt,false);
    const checkpoint=job.checkpoint as {fingerprint?:string}|null;
    if(current.fingerprint!==checkpoint?.fingerprint){
      await db().exportJob.updateMany({where:{id,accountId:a.id},data:{status:'REVOKED',revokedAt:new Date()}});
      return new Response('These responses or their permissions changed. Prepare a fresh export.',{status:409,headers});
    }
    const response=await readExport(job.storageKey);
    const bytes=await verifiedExportBytes(response,job.fileBytes,job.checksumSha256);
    await requirePlanFeature(a.id,'csv');
    const stillAllowed=await db().exportJob.count({where:{id,accountId:a.id,account:{status:'ACTIVE'},status:'READY',revokedAt:null,expiresAt:{gt:new Date()}}});
    if(!stillAllowed)return new Response('Export access revoked.',{status:410,headers});
    await db().exportJob.updateMany({where:{id,accountId:a.id},data:{lastDownloadedAt:new Date(),downloadCount:{increment:1}}});
    return new Response(new Uint8Array(bytes),{headers:{...headers,'Content-Type':'text/csv;charset=utf-8','Content-Disposition':`attachment; filename="${(job.fileName||'unsaidbox-export.csv').replace(/[^A-Za-z0-9._-]/g,'_')}"`}});
  }catch(error){
    unstable_rethrow(error);
    console.warn('export_download_failed');
    return new Response('The export could not be downloaded. Check your plan and try again.',{status:503,headers});
  }
}
