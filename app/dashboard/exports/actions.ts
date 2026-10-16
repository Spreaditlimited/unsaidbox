'use server';
import { randomUUID } from 'node:crypto';
import { requireAccount, rateLimit } from '@/lib/auth';
import { requirePlanFeature } from '@/lib/plans';
import { planMode } from '@/lib/plan-policy.mjs';
import { db } from '@/lib/db';
import { verifyCaptcha } from '@/lib/captcha.mjs';
import { InputError } from '@/lib/security.mjs';
import { parseExportFilters } from '@/lib/export-policy.mjs';
import { scheduleExport } from '@/lib/export-jobs';
import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type { Result } from '@/app/actions';

export async function createExport(_:Result,data:FormData):Promise<Result>{
  try{
    const account=await requireAccount();
    await verifyCaptcha(data,'createExport');
    await requirePlanFeature(account.id,'csv');
    let filters;
    try{filters=parseExportFilters({...Object.fromEntries(data),columns:data.getAll('columns')});}catch(error){throw new InputError((error as Error).message);}
    if(filters.sourceId){
      const owned=filters.source==='forms'?await db().feedbackForm.count({where:{id:filters.sourceId,accountId:account.id}}):await db().question.count({where:{id:filters.sourceId,accountId:account.id}});
      if(!owned)throw new InputError('Collection link not found.');
    }
    await rateLimit(`exports:${account.id}`,30,3600);
    const job=await db().$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM Account WHERE id = ${account.id} FOR UPDATE`;
      const pending=await tx.exportJob.count({where:{accountId:account.id,status:{in:['QUEUED','RUNNING']},revokedAt:null,expiresAt:{gt:new Date()}}});
      if(pending)throw new InputError('An export is already waiting or preparing. Use its retry control if preparation was interrupted.');
      return tx.exportJob.create({data:{accountId:account.id,requestKey:randomUUID(),source:filters.source,purpose:filters.purpose,layout:filters.layout,timezone:filters.timezone,filters,columns:filters.columns,policyVersion:`sharing-v1:${planMode()}`,expiresAt:new Date(Date.now()+86400000),fileName:`unsaidbox-${filters.purpose.toLowerCase()}-${filters.source}-${filters.from}-${filters.to}-${randomUUID().slice(0,8)}.csv`,mimeType:'text/csv;charset=utf-8'}});
    });
    scheduleExport(job.id,account.id);
    revalidatePath('/dashboard/exports');
    return {success:'Export queued. Preparation continues after this request. Refresh the history to check progress; your download will expire after 24 hours.'};
  }catch(error){unstable_rethrow(error);return {error:error instanceof InputError?error.message:'Export could not be queued. Please try again.'};}
}
export async function retryExport(id:string,_:Result,data:FormData):Promise<Result>{
  try {
  const account=await requireAccount();
  await verifyCaptcha(data,'retryExport');
  await requirePlanFeature(account.id,'csv');
  await rateLimit(`export-retry:${account.id}`,10,3600);
  const job=await db().exportJob.findFirst({where:{id,accountId:account.id,revokedAt:null,expiresAt:{gt:new Date()},attempts:{lt:3},OR:[{status:'QUEUED'},{status:'FAILED'},{status:'RUNNING',lockedUntil:{lt:new Date()}}]}});
  if(!job)return {error:'This export is running, expired or has reached three attempts. Create a new export if needed.'};
  scheduleExport(job.id,account.id);
  return {success:'Preparation requested. Refresh the history shortly.'};
  }catch(error){unstable_rethrow(error);return {error:error instanceof InputError?error.message:'Export preparation could not be restarted. Please try again.'};}
}
export async function revokeExport(id:string,_:Result,data:FormData):Promise<Result>{
  try {
  const account=await requireAccount();
  await verifyCaptcha(data,'revokeExport');
  await db().exportJob.updateMany({where:{id,accountId:account.id},data:{revokedAt:new Date(),status:'REVOKED'}});
  revalidatePath('/dashboard/exports');
  return {success:'Download access revoked. A file already downloaded cannot be recalled.'};
  }catch(error){unstable_rethrow(error);return {error:error instanceof InputError?error.message:'Access could not be revoked. Please try again.'};}
}

export async function saveExportPreset(_:Result,data:FormData):Promise<Result>{
  try{
    const a=await requireAccount();
    await verifyCaptcha(data,'saveExportPreset');
    await requirePlanFeature(a.id,'csv');
    await rateLimit(`export-presets:${a.id}`,30,3600);
    const name=String(data.get('name')||'').trim();
    if(!name||name.length>100)throw new InputError('Enter a preset name of up to 100 characters.');
    const filters=parseExportFilters({...Object.fromEntries(data),columns:data.getAll('columns')});
    await db().$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM Account WHERE id = ${a.id} FOR UPDATE`;
      if(await tx.exportPreset.count({where:{accountId:a.id}})>=30)throw new InputError('You have 30 saved presets. Remove one before adding another.');
      await tx.exportPreset.create({data:{accountId:a.id,name,source:filters.source,purpose:filters.purpose,layout:filters.layout,timezone:filters.timezone,filters,columns:filters.columns}});
    });
    revalidatePath('/dashboard/exports');return {success:'Export preset saved. Dates are saved exactly as selected.'};
  }catch(error){unstable_rethrow(error);return {error:error instanceof InputError?error.message:'Preset could not be saved. Check your filters and try again.'};}
}
export async function deleteExportPreset(id:string,_:Result,data:FormData):Promise<Result>{
  try {
  const a=await requireAccount();
  await verifyCaptcha(data,'deleteExportPreset');
  await db().exportPreset.deleteMany({where:{id,accountId:a.id}});
  revalidatePath('/dashboard/exports');return {success:'Saved preset removed. Responses and export files are unchanged.'};
  }catch(error){unstable_rethrow(error);return {error:error instanceof InputError?error.message:'Preset could not be removed. Please try again.'};}
}
