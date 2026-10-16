'use server';
import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { requireAccount, rateLimit } from '@/lib/auth';
import { verifyCaptcha } from '@/lib/captcha.mjs';
import { db } from '@/lib/db';
import { InputError } from '@/lib/security.mjs';
import type { Result } from '@/app/actions';

export async function reviewEntry(entryId:string, _:Result, data:FormData):Promise<Result> {
  try {
    const account = await requireAccount();
    await verifyCaptcha(data,'reviewEntry');
    await rateLimit(`entry-review:${account.id}`,120,3600);
    const status = String(data.get('status')||'');
    const note = String(data.get('note')||'').trim();
    const tags = [...new Set(String(data.get('tags')||'').split(',').map(s=>s.trim()).filter(Boolean))];
    const revision = Number(data.get('revision'));
    if (!['NEW','REVIEWED','ACTION_NEEDED','RESOLVED'].includes(status) || note.length>5000 || tags.length>12 || tags.some(t=>t.length>40) || !Number.isSafeInteger(revision) || revision<0) throw new InputError('Check your review status, tags (up to 12, 40 characters each) and note (up to 5,000 characters).');
    const formId = await db().$transaction(async tx=>{
      const entry = await tx.feedbackEntry.findFirst({where:{id:entryId,form:{accountId:account.id}},select:{formId:true}});
      if (!entry) throw new InputError('Response not found.');
      const values = {status,note:note||null,tags,starred:data.get('starred')==='on'};
      if (revision===0) await tx.feedbackEntryReview.create({data:{entryId,...values}});
      else {
        const changed = await tx.feedbackEntryReview.updateMany({where:{entryId,revision,entry:{form:{accountId:account.id}}},data:{...values,revision:{increment:1}}});
        if (!changed.count) throw new InputError('This review changed in another window. Refresh before saving.');
      }
      return entry.formId;
    });
    revalidatePath(`/dashboard/forms/${formId}/insights`);
    return {success:'Private review saved. The original answers and sharing permissions are unchanged.'};
  } catch(error) {
    unstable_rethrow(error);
    return {error:error instanceof InputError?error.message:'Review could not be saved. Refresh and try again.'};
  }
}
