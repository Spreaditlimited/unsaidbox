"use server";
import { unstable_rethrow } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAccount, rateLimit } from '@/lib/auth';
import { verifyCaptcha } from '@/lib/captcha.mjs';
import { requirePlanFeature } from '@/lib/plans';
import { db } from '@/lib/db';
import { InputError, textValue } from '@/lib/security.mjs';
import { prepareAvatar } from '@/lib/avatar-image.mjs';
import { csvDocument } from '@/lib/plan-policy.mjs';

function message(error: unknown) {
  unstable_rethrow(error);
  return error instanceof InputError ? error.message : 'This request could not be completed. Check your plan and try again.';
}
export async function saveBrand(form: FormData) {
  try {
    const account = await requireAccount();
    await verifyCaptcha(form, 'saveBrand');
    await rateLimit(`brand:${account.id}`, 20, 3600);
    await requirePlanFeature(account.id, 'branding');
    const name = textValue(form.get('name'), 'Brand name', 60, 0);
    const accent = String(form.get('accent') ?? '').toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(accent)) throw new InputError('Enter a six-digit colour such as #5850B8.');
    const channels = [1, 3, 5].map(i => parseInt(accent.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    const luminance = .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
    if (1.05 / (luminance + .05) < 4.5) throw new InputError('Choose a darker accent colour so your branding remains readable on light cards.');
    const file = form.get('logo');
    let logo: Uint8Array<ArrayBuffer> | undefined;
    if (file instanceof File && file.size) {
      try { logo = new Uint8Array(await prepareAvatar(file)); }
      catch (error) { throw new InputError((error as Error).message); }
    }
    const data = { name, accent, hideAttribution: form.get('hideAttribution') === 'on',
      ...(logo ? { logo } : form.get('removeLogo') === 'on' ? { logo: null } : {}) };
    await db().brandSettings.upsert({ where: { accountId: account.id }, create: { accountId: account.id, ...data }, update: data });
    revalidatePath('/dashboard/billing');
    return { success: 'Brand settings saved. Newly opened share studios will use them.' };
  } catch (error) { return { error: message(error) }; }
}

export async function exportResponses(form: FormData): Promise<{ error?: string; csv?: string; filename?: string; next?: string; count?: number }> {
  try {
    const account = await requireAccount();
    await verifyCaptcha(form, 'exportResponses');
    await rateLimit(`csv:${account.id}`, 30, 3600);
    await requirePlanFeature(account.id, 'csv');
    const source = String(form.get('source'));
    if (!['messages', 'forms'].includes(source)) throw new InputError('Choose an export source.');
    const month = String(form.get('month'));
    if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) throw new InputError('Enter a month as YYYY-MM.');
    const start = new Date(`${month}-01T00:00:00Z`);
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const cursor = String(form.get('cursor') || '');
    if (cursor && !/^[a-zA-Z0-9]{1,30}$/.test(cursor)) throw new InputError('Invalid export position. Start again.');
    const rows: string[][] = [['Record ID', 'Received (UTC)', 'Question', 'Response']];
    let ids: string[];
    if (source === 'messages') {
      const data = await db().submission.findMany({ where: { accountId: account.id, sharingPolicy: 'OWNER_MAY_SHARE', status: 'APPROVED', createdAt: { gte: start, lt: end }, ...(cursor ? { id: { gt: cursor } } : {}) }, orderBy: { id: 'asc' }, take: 201, select: { id: true, createdAt: true, body: true, publicBody: true, question: { select: { body: true } } } });
      ids = data.map(item => item.id);
      rows.push(...data.slice(0, 200).map(item => [item.id, item.createdAt.toISOString(), item.question?.body ?? 'Inbox message', item.publicBody ?? item.body]));
    } else {
      const data = await db().feedbackAnswer.findMany({ where: { entry: { shareAllowed: true, createdAt: { gte: start, lt: end }, form: { accountId: account.id, allowSharing: true, blocked: false } }, ...(cursor ? { id: { gt: cursor } } : {}) }, orderBy: { id: 'asc' }, take: 201, select: { id: true, label: true, textValue: true, numberValue: true, entry: { select: { createdAt: true } } } });
      ids = data.map(item => item.id);
      rows.push(...data.slice(0, 200).map(item => [item.id, item.entry.createdAt.toISOString(), item.label, item.textValue ?? String(item.numberValue ?? '')]));
    }
    const csv = csvDocument(rows);
    if (Buffer.byteLength(csv, 'utf8') > 3 * 1024 * 1024) throw new InputError('This batch is too large to export. Please contact support.');
    return { csv, filename: `unsaidbox-${source}-${month}${cursor ? '-continued' : ''}.csv`, count: rows.length - 1, next: ids.length > 200 ? ids[199] : '' };
  } catch (error) { return { error: message(error) }; }
}
