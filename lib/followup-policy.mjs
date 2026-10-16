import { InputError } from './security.mjs';

export const FOLLOWUP_DAYS = 90;
export const FOLLOWUP_LIMIT = 100;
export const validFollowupToken = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export const validRequestKey = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);

export function followupAvailable(conversation, now = new Date()) {
  return Boolean(conversation && conversation.account.status === 'ACTIVE'
    && Boolean(conversation.submission) !== Boolean(conversation.entry)
    && conversation.expiresAt > now
    && (!conversation.submission || conversation.submission.status !== 'SPAM')
    && (!conversation.entry || !conversation.entry.form.blocked));
}

export function assertFollowupOpen(conversation, now = new Date()) {
  if (!followupAvailable(conversation, now)) throw new InputError('This private conversation is no longer available.');
  if (conversation.closedAt) throw new InputError('This conversation has been closed.');
  if (conversation.messageCount >= FOLLOWUP_LIMIT) throw new InputError('This conversation has reached its 100-reply limit.');
}
