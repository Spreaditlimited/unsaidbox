'use server';
import {requireAdministrator} from '@/lib/admin-auth';
import {rateLimit} from '@/lib/auth';
import {verifyCaptcha} from '@/lib/captcha.mjs';
import {billingEnvironment} from '@/lib/billing-runtime.mjs';
import {stripeClient} from '@/lib/stripe';
import {db} from '@/lib/db';
import {repairAllowanceAnchors} from '@/lib/repair-allowance-anchor.mjs';
import {revalidatePath} from 'next/cache';
import {unstable_rethrow} from 'next/navigation';
import type {Result} from '@/app/actions';

export async function repairCustomerAllowance(accountId:string,_:Result,form:FormData):Promise<Result>{
  try{
    const administrator=await requireAdministrator();
    await verifyCaptcha(form,'repairCustomerAllowance');
    await rateLimit(`admin-allowance-repair:${administrator.id}`,10,300);
    const {mode}=billingEnvironment();
    const count=await repairAllowanceAnchors({client:db(),stripe:stripeClient(),accountId,mode,actorId:administrator.id});
    revalidatePath(`/admin/users/${accountId}`);
    revalidatePath('/dashboard/billing');
    return {success:count?'Allowance dates restored from Stripe. Existing usage and payments were not changed.':'No missing allowance dates remain. Refresh the page to see the current values.'};
  }catch(error){
    unstable_rethrow(error);
    console.warn('admin_allowance_repair_failed');
    return {error:'Allowance dates could not be verified with Stripe. No date was guessed. Try again or check the subscription in Stripe.'};
  }
}
