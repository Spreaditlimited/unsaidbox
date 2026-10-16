import { InputError } from './security.mjs';

export {consentVersion,consentStatement} from './marketing-consent.mjs';
export const folderName = 'UnsaidBox';
export const listName = 'UnsaidBox · opted-in marketing';
export const campaignTag = 'unsaidbox-newsletter';
export const marketingEnabled = (env = process.env) => env.UNSAIDBOX_MARKETING_ENABLED === 'true';
export const escapeEmail = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function audienceConfig(env = process.env) {
  const folderId = Number(env.UNSAIDBOX_BREVO_FOLDER_ID);
  const listId = Number(env.UNSAIDBOX_BREVO_MARKETING_LIST_ID);
  if (!env.UNSAIDBOX_BREVO_API_KEY || ![folderId, listId].every(n => Number.isSafeInteger(n) && n > 0))
    throw new Error('MARKETING_CONFIG');
  return { folderId, listId };
}

export function validateCampaign(input) {
  const result = {};
  for (const key of ['subject','heading','preheader','body']) {
    const value = input[key];
    if (typeof value !== 'string' || value.length > (key === 'body' ? 12000 : 200) || (key !== 'preheader' && !value.trim()))
      throw new InputError('Add a subject, heading and message within the displayed limits.');
    // Only our own unsubscribe expression may reach the provider template engine.
    if (/\{\{|\{%|[\u0000]/.test(value) || (key !== 'body' && /[\r\n]/.test(value)))
      throw new InputError('Template expressions and header line breaks are not supported.');
    result[key] = value.trim();
  }
  return result;
}

export const eligibleSubscriber = row => Boolean(row?.subscribed && row.account?.status === 'ACTIVE' && row.account?.emailVerifiedAt);
export const suppressed = (contact, listId) => Boolean(contact?.emailBlacklisted || contact?.listUnsubscribed?.includes(listId));

export function renderCampaign(d, postalAddress, {digestNudge='preview'}={}) {
  if (!postalAddress?.trim()) throw new Error('MARKETING_ADDRESS');
  const e = escapeEmail;
  const blogUrls=d.createdBy==='system:weekly-digest'?[...d.body.matchAll(/https:\/\/unsaidbox\.com\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*/g)].map(m=>m[0]):[];
  const cta=blogUrls[0]||'https://unsaidbox.com/dashboard';
  const ctaLabel=blogUrls.length?'Read the full post':'Open UnsaidBox';
  const help='<div style="margin-top:28px;padding-top:24px;border-top:1px solid #e4e2e9"><h2 style="font-size:19px;line-height:1.4">Still working out what to ask your audience?</h2><p style="line-height:1.8">What’s getting in the way — choosing a question, knowing where to share it, or something else? You don’t have to figure it out on your own.</p><p style="line-height:1.8">Hit reply and tell us what you’re stuck on. If you have a question about UnsaidBox, we’d love to help.</p></div>';
  const nudge=!blogUrls.length||digestNudge==='hide'?'':digestNudge==='conditional'?`{% if contact.UNSAIDBOX_AUDIENCE_STAGE == "NO_QUESTION" %}${help}{% endif %}`:help;
  const paragraphs = d.body.split(/\n\s*\n/).map(p => `<p style="margin:0 0 20px;line-height:1.8">${e(p).replace(/https:\/\/unsaidbox\.com\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*/g,url=>blogUrls.includes(url)?`<a href="${url}" style="color:#5850b8">Read the full post →</a>`:url).replaceAll('\n','<br>')}</p>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#faf9f6;color:#202332;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${e(d.preheader)}</div><table role="presentation" width="100%"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:600px"><tr><td style="padding:0 0 24px;font-size:26px;color:#5850b8"><b>Unsaid</b>Box</td></tr><tr><td style="background:white;border:1px solid #e4e2e9;border-top:4px solid #5850b8;border-radius:16px;padding:32px 28px"><h1 style="font-size:30px;line-height:1.3;margin:0 0 24px">${e(d.heading)}</h1><div style="font-size:16px;color:#646572">${paragraphs}</div><p style="margin:30px 0 12px"><a href="${e(cta)}" style="display:inline-block;padding:16px 22px;background:#5850b8;color:white;border-radius:9px;text-decoration:none;font-weight:bold">${ctaLabel}</a></p>${nudge}</td></tr><tr><td style="padding:24px 4px;font-size:12px;line-height:1.8;color:#646572">You opted in to UnsaidBox tips, product updates and occasional offers.<br>UnsaidBox · ${e(postalAddress)}<br><a href="mailto:hello@unsaidbox.com">hello@unsaidbox.com</a><br><a href="https://unsaidbox.com/dashboard/settings">Email preferences</a> · <a href="{{ unsubscribe }}">Unsubscribe from marketing emails</a> · <a href="https://unsaidbox.com/safety">Privacy</a></td></tr></table></td></tr></table></body></html>`;
}
