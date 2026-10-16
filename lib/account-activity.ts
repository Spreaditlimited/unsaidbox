import 'server-only';
import { after } from 'next/server';
import { db } from './db';

export function recordMilestone(accountId:string,kind:'question'|'form'|'response') {
  const observedAt=new Date();
  const field=kind==='question'?'firstQuestionAt':kind==='form'?'firstFormAt':'firstResponseAt';
  after(async()=>{
    try {
      await db().accountActivity.upsert({where:{accountId},create:{accountId,[field]:observedAt},update:{}});
      await db().accountActivity.updateMany({where:{accountId,OR:[{[field]:null},{[field]:{gt:observedAt}}]},data:{[field]:observedAt}});
    } catch { console.warn('account_milestone_recording_failed'); }
  });
}

export function recordAccountActivity(accountId: string, kind: 'login' | 'dashboard') {
  after(async () => {
    try {
      const now = new Date();
      const previous = await db().accountActivity.findUnique({ where: { accountId }, select: { lastDashboardAt: true } });
      if (kind === 'dashboard' && previous?.lastDashboardAt && now.getTime() - previous.lastDashboardAt.getTime() < 300000) return;
      const data = kind === 'login' ? { lastLoginAt: now } : { lastDashboardAt: now };
      await db().accountActivity.upsert({ where: { accountId }, create: { accountId, ...data }, update: data });
    } catch { console.warn('account_activity_recording_failed'); }
  });
}
