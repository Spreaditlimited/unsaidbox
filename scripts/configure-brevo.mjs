import { readFile, writeFile, chmod, mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { brevo } from '../lib/brevo.mjs';
import { folderName, listName } from '../lib/marketing-policy.mjs';

// Explicit one-time owner-authorized import of the Effikos Brevo credential only.
// No other project's configuration, contacts, database or auth is imported.
const file=new URL('../.env',import.meta.url);
try {
  const before=await readFile(file,'utf8');
  const saved=parseEnv(before);
  let key=saved.UNSAIDBOX_BREVO_API_KEY;
  if (!key && process.argv.includes('--shared-effikos')) {
    const effikos=parseEnv(await readFile(new URL('../../effikos/.env.local',import.meta.url),'utf8'));
    key=effikos.EFFIKOS_BREVO_API_KEY;
  }
  if (!key) throw new Error('BREVO_KEY_MISSING');
  const env={UNSAIDBOX_BREVO_API_KEY:key};
  const call=(path,method,body)=>brevo(path,method,body,{env});
  await call('account');
  console.log('Shared Brevo API connection verified. No credentials or account details printed.');
  const folders=await call('contacts/folders?limit=50&offset=0');
  let ownFolder=folders.folders?.find(f=>f.name===folderName);
  if (!ownFolder) ownFolder=await call('contacts/folders','POST',{name:folderName});
  if (!Number.isSafeInteger(ownFolder?.id)||ownFolder.id<1) throw new Error('BREVO_FOLDER');
  const lists=await call(`contacts/folders/${ownFolder.id}/lists?limit=50&offset=0`);
  let ownList=lists.lists?.find(l=>l.name===listName);
  if (!ownList) ownList=await call('contacts/lists','POST',{name:listName,folderId:ownFolder.id});
  if (!Number.isSafeInteger(ownList?.id)||ownList.id<1) throw new Error('BREVO_LIST');
  const senders=await call('senders');
  if (!senders.senders?.some(s=>s.email?.toLowerCase()==='hello@unsaidbox.com')) await call('senders','POST',{name:'UnsaidBox',email:'hello@unsaidbox.com'});
  let domain=await call('senders/domains/unsaidbox.com');
  if (!domain) {
    await call('senders/domains','POST',{name:'unsaidbox.com'});
    domain=await call('senders/domains/unsaidbox.com');
  }
  const values={UNSAIDBOX_BREVO_API_KEY:key,UNSAIDBOX_BREVO_FOLDER_ID:String(ownFolder.id),UNSAIDBOX_BREVO_MARKETING_LIST_ID:String(ownList.id),UNSAIDBOX_MARKETING_POSTAL_ADDRESS:'Tochukwu Tech and AI Academy, 33 Bevan Court, Dunlop Street, WA4 6AA, Warrington, England'};
  if (await readFile(file,'utf8')!==before) throw new Error('ENV_CHANGED');
  const preserved=before.split('\n').filter(line=>!Object.keys(values).some(name=>line.startsWith(name+'='))).join('\n');
  await chmod(file,0o600);
  await writeFile(file,preserved.trimEnd()+'\n\n# UnsaidBox Brevo; shared account, brand-specific audience.\n'+Object.entries(values).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join('\n')+'\n',{mode:0o600});
  await mkdir(new URL('../docs/email/',import.meta.url),{recursive:true});
  const record={domain:'unsaidbox.com',authenticated:domain?.authenticated===true,verified:domain?.verified===true,folderId:ownFolder.id,listId:ownList.id,dnsRecords:domain?.dns_records??{},checkedAt:new Date().toISOString()};
  await writeFile(new URL('../docs/email/brevo-domain.json',import.meta.url),JSON.stringify(record,null,2)+'\n');
  console.log(JSON.stringify({folderId:ownFolder.id,listId:ownList.id,domainAuthenticated:record.authenticated,settingsSaved:true,marketingEnabled:saved.UNSAIDBOX_MARKETING_ENABLED==='true'}));
  console.log('DNS requirements saved in docs/email/brevo-domain.json. No DNS changed. No marketing email sent.');
} catch(error) {
  console.error('Brevo setup stopped:',/^[A-Z_]+$/.test(error?.message??'')?error.message:'SETUP_FAILED','No secrets printed. Inspect provider state before repeating an uncertain mutation.');
  process.exitCode=1;
}
