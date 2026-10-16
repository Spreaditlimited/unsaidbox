import { audienceConfig, folderName, listName, suppressed } from './marketing-policy.mjs';

// Server boundary. Never print keys, recipient data, provider bodies or recovery links.
export async function brevo(path, method = 'GET', body = undefined, { env = process.env, request = fetch } = {}) {
  if (!env.UNSAIDBOX_BREVO_API_KEY || !/^[a-zA-Z0-9/?=&%._@+-]+$/.test(path)) throw new Error('BREVO_CONFIG');
  let response;
  try {
    response = await request('https://api.brevo.com/v3/' + path, {
      method, headers: { 'api-key': env.UNSAIDBOX_BREVO_API_KEY, 'content-type': 'application/json', accept:'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(12000),
    });
  } catch { throw new Error(method === 'GET' ? 'BREVO_UNAVAILABLE' : 'BREVO_UNCERTAIN'); }
  if (response.status === 404 && method === 'GET') return null;
  if (!response.ok) throw new Error(response.status >= 500 || response.status === 408 ? 'BREVO_UNCERTAIN' : 'BREVO_REJECTED');
  if (response.status === 204) return {};
  try { return await response.json(); } catch { throw new Error('BREVO_UNCERTAIN'); }
}

export async function verifyAudience(call = brevo, env = process.env) {
  const {folderId,listId} = audienceConfig(env);
  const folder = await call(`contacts/folders/${folderId}`);
  const list = await call(`contacts/lists/${listId}`);
  if (folder?.name !== folderName || list?.folderId !== folderId || list?.name !== listName) throw new Error('WRONG_AUDIENCE');
  return {folderId,listId};
}

export async function syncMembership(email, subscribed, call = brevo, env = process.env) {
  const {listId} = await verifyAudience(call, env);
  const path = 'contacts/' + encodeURIComponent(email.toLowerCase());
  const contact = await call(path);
  if (!subscribed) {
    if (contact?.listIds?.includes(listId)) await call(path,'PUT',{unlinkListIds:[listId]});
    return 'synced';
  }
  if (suppressed(contact,listId)) return 'blocked';
  if (!contact) await call('contacts','POST',{email:email.toLowerCase(),listIds:[listId],updateEnabled:false});
  else if (!contact.listIds?.includes(listId)) await call(path,'PUT',{listIds:[listId]});
  return 'synced';
}

export async function assertSender(call = brevo) {
  const result = await call('senders');
  if (!result?.senders?.some(s => s.email?.toLowerCase() === 'hello@unsaidbox.com' && s.active === true)) throw new Error('BREVO_SENDER');
  const domain = await call('senders/domains/unsaidbox.com');
  if (domain?.authenticated !== true) throw new Error('BREVO_DOMAIN');
}

export async function sendBrevoMail({to,subject,html,text,tag,replyTo = undefined}, options = {}) {
  const result = await brevo('smtp/email','POST',{
    sender:{name:'UnsaidBox',email:'hello@unsaidbox.com'},
    replyTo:replyTo ?? {name:'UnsaidBox',email:'hello@unsaidbox.com'},
    to:[{email:to}],subject,htmlContent:html,textContent:text,tags:['unsaidbox',tag],
  }, options);
  if (typeof result?.messageId !== 'string' || !result.messageId) throw new Error('BREVO_UNCERTAIN');
  return result.messageId;
}
