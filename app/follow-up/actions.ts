'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAccount, rateLimit } from '@/lib/auth';
import { verifyCaptcha } from '@/lib/captcha.mjs';
import { digest, InputError, textValue } from '@/lib/security.mjs';
import { assertFollowupOpen, followupAvailable, validFollowupToken, validRequestKey } from '@/lib/followup-policy.mjs';
import { followupRelations, senderConversation } from '@/lib/followups';
import type { Result } from '@/app/actions';

function failure(error: unknown): Result {
  unstable_rethrow(error);
  if (error instanceof InputError) return { error: error.message };
  // Never log request bodies, credentials or Prisma query arguments.
  console.error('Private follow-up operation failed', { code: (error as { code?: string }).code ?? 'UNKNOWN' });
  return { error: 'Your request could not be completed. Please try again.' };
}

export async function openFollowup(_: Result, form: FormData): Promise<Result> {
  try {
    const value = form.get('returnToken');
    if (!validFollowupToken(value)) throw new InputError('Open the complete private return link you saved after sending.');
    await verifyCaptcha(form, 'openFollowup');
    await rateLimit(`followup-open:${digest(String(value))}`, 30, 900);
    const c = await db().followupConversation.findUnique({ where: { tokenHash: digest(String(value)) }, include: followupRelations });
    if (!followupAvailable(c)) throw new InputError('This private link is invalid or no longer available.');
    (await cookies()).set('unsaidbox_followup', String(value), {
      httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production',
      path: `/follow-up/${c!.id}`, expires: c!.expiresAt,
    });
    return { conversationId: c!.id };
  } catch (error) { return failure(error); }
}

export async function replyFollowup(id: string, owner: boolean, _: Result, form: FormData): Promise<Result> {
  try {
    await verifyCaptcha(form, 'replyFollowup');
    const account = owner ? await requireAccount() : null;
    const sender = owner ? null : await senderConversation(id);
    if (!account && !sender) throw new InputError('Open your private return link again.');
    const body = textValue(form.get('body'), 'Reply', 3000);
    const requestKey = String(form.get('requestKey') ?? '');
    if (!validRequestKey(requestKey)) throw new InputError('Reload this conversation before replying.');
    await rateLimit(`followup:${id}:${owner ? 'owner' : 'sender'}`, 20, 3600);
    if (account) await rateLimit(`followup-owner:${account.id}`, 200, 3600);
    await db().$transaction(async tx => {
      // Row lock serializes replies and closing. The owner scope is derived from auth.
      const gate = await tx.followupConversation.updateMany({
        where: { id, ...(account ? { accountId: account.id } : { tokenHash: sender!.tokenHash }) },
        data: { updatedAt: new Date() },
      });
      if (!gate.count) throw new InputError('Conversation not found.');
      const c = await tx.followupConversation.findUnique({ where: { id }, include: followupRelations });
      assertFollowupOpen(c);
      const previous = await tx.followupMessage.findUnique({ where: { conversationId_requestKey: { conversationId: id, requestKey } } });
      if (previous) {
        if (previous.author !== (owner ? 'OWNER' : 'SENDER') || previous.body !== body) throw new InputError('This reply was already sent. Refresh before writing another.');
        return;
      }
      await tx.followupMessage.create({ data: { conversationId: id, body, author: owner ? 'OWNER' : 'SENDER', requestKey } });
      await tx.followupConversation.update({ where: { id }, data: {
        messageCount: { increment: 1 }, ...(owner ? { lastOwnerAt: new Date() } : { lastSenderAt: new Date() }),
      } });
    }, { isolationLevel: 'ReadCommitted' });
    revalidatePath(`/follow-up/${id}`);
    revalidatePath('/dashboard/follow-ups', 'layout');
    return { success: 'Reply saved to this private conversation.' };
  } catch (error) { return failure(error); }
}

export async function closeFollowup(id: string, owner: boolean, _: Result, form: FormData): Promise<Result> {
  try {
    await verifyCaptcha(form, 'closeFollowup');
    const account = owner ? await requireAccount() : null;
    const sender = owner ? null : await senderConversation(id);
    if (!account && !sender) throw new InputError('Open your private return link again.');
    const closed = await db().followupConversation.updateMany({
      where: { id, ...(account ? { accountId: account.id } : { tokenHash: sender!.tokenHash }) },
      data: { closedAt: new Date() },
    });
    if (!closed.count) throw new InputError('Conversation not found.');
    revalidatePath(`/follow-up/${id}`);
    revalidatePath('/dashboard/follow-ups', 'layout');
    return { success: 'Conversation closed. Neither side can send more replies.' };
  } catch (error) { return failure(error); }
}

export async function reportFollowup(id: string, _: Result, form: FormData): Promise<Result> {
  try {
    await verifyCaptcha(form, 'reportFollowup');
    const c = await senderConversation(id);
    if (!c) throw new InputError('Open your private return link again.');
    const reason = textValue(form.get('reason'), 'Reason', 700, 10);
    await rateLimit(`followup-report:${id}`, 3, 86400);
    await db().$transaction(async tx => {
      await tx.report.create({ data: { submissionId: c.submissionId, reason: `Private follow-up ${id} (owner ${c.accountId}): ${reason}` } });
      await tx.followupConversation.update({ where: { id }, data: { closedAt: new Date() } });
    });
    revalidatePath(`/follow-up/${id}`);
    return { success: 'Report received. This conversation is now closed.' };
  } catch (error) { return failure(error); }
}
