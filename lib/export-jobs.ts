import 'server-only';
import { randomBytes, createHash } from 'node:crypto';
import { after } from 'next/server';
import { db } from './db';
import { requirePlanFeature } from './plans';
import { planMode } from './plan-policy.mjs';
import { parseExportFilters } from './export-policy.mjs';
import { collectExport, exportCounts } from './export-data';
import { storeExport, removeExport } from './export-storage';

export function scheduleExport(id:string,accountId:string){
  after(async()=>{try{await processExport(id,accountId);}catch{console.warn('export_worker_unavailable');}});
}
export async function processExport(id:string,accountId:string){
  const key=createHash('sha256').update('unsaidbox:export-worker-capacity:v1').digest('hex');
  const lease=randomBytes(3).readUIntBE(0,3)+1;
  await db().rateLimit.upsert({where:{key},create:{key,count:0,expiresAt:new Date(0)},update:{}});
  const capacity=await db().rateLimit.updateMany({where:{key,expiresAt:{lt:new Date()}},data:{count:lease,expiresAt:new Date(Date.now()+300000)}});
  if(!capacity.count)return;
  const renew = async () => {
    const renewed=await db().rateLimit.updateMany({where:{key,count:lease,expiresAt:{gt:new Date()}},data:{expiresAt:new Date(Date.now()+300000)}});
    if(!renewed.count)throw new Error('EXPORT_LEASE_LOST');
  };
  try { await processClaimedExport(id,accountId,renew); }
  finally { await db().rateLimit.updateMany({where:{key,count:lease},data:{expiresAt:new Date(0)}}); }
}
async function processClaimedExport(id:string,accountId:string,renew:()=>Promise<void>){
  const lockToken=randomBytes(32).toString('hex');
  const now=new Date();
  // A durable lease prevents duplicate processing; creation enforces one outstanding job per owner.
  const claimed=await db().exportJob.updateMany({where:{id,accountId,revokedAt:null,expiresAt:{gt:now},OR:[{status:'QUEUED'},{status:'FAILED'},{status:'RUNNING',lockedUntil:{lt:now}}],attempts:{lt:3}},data:{status:'RUNNING',lockToken,lockedUntil:new Date(Date.now()+300000),startedAt:now,attempts:{increment:1},lastErrorCode:null}});
  if(!claimed.count)return;
  let key:string|null=null;
  try{
    const job=await db().exportJob.findFirstOrThrow({where:{id,accountId,lockToken}});
    if(job.storageKey){await removeExport(job.storageKey);await db().exportJob.update({where:{id},data:{storageKey:null}});}
    if(job.policyVersion!==`sharing-v1:${planMode()}`)throw new Error('EXPORT_ENVIRONMENT_CHANGED');
    await requirePlanFeature(accountId,'csv');
    const account=await db().account.findUnique({where:{id:accountId},select:{status:true}});
    if(account?.status!=='ACTIVE')throw new Error('EXPORT_ACCESS_REVOKED');
    const filters=parseExportFilters(job.filters);
    const counts=await exportCounts(accountId,filters,job.snapshotAt);
    const result=await collectExport(accountId,filters,job.snapshotAt,true,async processedRecords=>{
      await renew();
      const updated=await db().exportJob.updateMany({where:{id,accountId,lockToken,status:'RUNNING',revokedAt:null,lockedUntil:{gt:new Date()},expiresAt:{gt:new Date()}},data:{processedRecords,lockedUntil:new Date(Date.now()+300000)}});
      if(!updated.count)throw new Error('EXPORT_ACCESS_REVOKED');
    });
    key=`unsaidbox/exports/${id}/${randomBytes(16).toString('hex')}.csv`;
    // Record the object reference before upload so cleanup can recover interrupted jobs.
    await renew();
    const saved=await db().exportJob.updateMany({where:{id,accountId,lockToken,status:'RUNNING',revokedAt:null,lockedUntil:{gt:new Date()}},data:{storageKey:key}});
    if(!saved.count)throw new Error('EXPORT_LEASE_LOST');
    await storeExport(key,result.bytes!);
    await renew();
    const updated=await db().exportJob.updateMany({where:{id,accountId,lockToken,status:'RUNNING',revokedAt:null,lockedUntil:{gt:new Date()},expiresAt:{gt:new Date()}},data:{...counts,excludedRecords:Math.max(0,counts.matchingRecords-result.records),eligibleRecords:result.records,outputRows:result.rows,processedRecords:result.records,status:'READY',completedAt:new Date(),fileBytes:result.bytes!.length,checksumSha256:createHash('sha256').update(result.bytes!).digest('hex'),checkpoint:{fingerprint:result.fingerprint},lockToken:null,lockedUntil:null}});
    if(!updated.count)throw new Error('EXPORT_ACCESS_REVOKED');
  }catch(error){
    const code=error instanceof Error && /^EXPORT_[A-Z_]+$/.test(error.message)?error.message:'EXPORT_PREPARATION_FAILED';
    if(key){try{await removeExport(key);}catch{console.warn('export_cleanup_pending');}}
    await db().exportJob.updateMany({where:{id,accountId,lockToken,revokedAt:null},data:{status:'FAILED',lastErrorCode:code,lockToken:null,lockedUntil:null}});
    console.warn('export_preparation_failed',{jobId:id,code});
  }
}
export async function cleanExpiredExports(){
  const jobs=await db().exportJob.findMany({where:{storageKey:{not:null},OR:[{expiresAt:{lt:new Date()}},{revokedAt:{not:null}}]},select:{id:true,storageKey:true},take:20});
  for(const job of jobs){
    try {
      await removeExport(job.storageKey!);
      await db().exportJob.updateMany({where:{id:job.id,storageKey:job.storageKey},data:{storageKey:null,status:'EXPIRED',checkpoint:{}}});
    } catch { console.warn('export_cleanup_pending',{jobId:job.id}); }
  }
}
