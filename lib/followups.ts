import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { timingSafeEqual } from 'node:crypto';
import { db } from './db';
import { digest } from './security.mjs';
import { followupAvailable, validFollowupToken } from './followup-policy.mjs';

export const followupsReady = cache(async () => {
  try {
    await db().followupConversation.findFirst({ select: { id: true } });
    await db().followupMessage.findFirst({ select: { id: true } });
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === 'P2021') return false;
    throw error;
  }
});

export const followupRelations = {
  account: { select: { status: true, username: true } },
  submission: { select: { body: true, status: true } },
  entry: { select: { form: { select: { blocked: true, title: true } }, answers: { select: { label: true, textValue: true, numberValue: true } } } },
} as const;

export async function senderConversation(id: string) {
  if (!/^[a-z0-9]{20,30}$/.test(id)) return null;
  const value = (await cookies()).get('unsaidbox_followup')?.value;
  if (!validFollowupToken(value)) return null;
  const conversation = await db().followupConversation.findUnique({ where: { id }, include: followupRelations });
  if (!conversation || !timingSafeEqual(Buffer.from(conversation.tokenHash, 'hex'), Buffer.from(digest(value), 'hex'))
    || !followupAvailable(conversation)) return null;
  return conversation;
}
