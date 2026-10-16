'use server';
import { requireAdministrator } from '@/lib/admin-auth';
import { rateLimit } from '@/lib/auth';
import { db } from '@/lib/db';
import { verifyCaptcha } from '@/lib/captcha.mjs';
import { InputError, textValue } from '@/lib/security.mjs';
import { unstable_rethrow } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { Result } from '@/app/actions';
export async function addCustomerNote(accountId:string,_:Result,data:FormData):Promise<Result> {
  try {
    const administrator = await requireAdministrator();
    await verifyCaptcha(data,'addCustomerNote');
    await rateLimit(`customer-note:${administrator.id}`,30,3600);
    const body = textValue(data.get('body'),'Support note',3000);
    await db().$transaction(async tx=>{
      await tx.administratorCustomerNote.create({data:{accountId,administratorId:administrator.id,body}});
      await tx.auditEvent.create({data:{actorId:administrator.id,targetId:accountId,action:'account:support_note_added'}});
    });
    revalidatePath(`/admin/users/${accountId}`);
    return {success:'Internal support note added.'};
  } catch(error) { unstable_rethrow(error); return {error:error instanceof InputError?error.message:'Support note could not be saved.'}; }
}
