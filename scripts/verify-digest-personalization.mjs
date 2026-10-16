import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {brevo,sendBrevoMail} from '../lib/brevo.mjs';
import {renderCampaign} from '../lib/marketing-policy.mjs';
import {digestStageAttribute,verifyDigestAttribute} from '../lib/marketing-segments.mjs';
const email='hello@unsaidbox.com',path='contacts/'+encodeURIComponent(email);
const e=parseEnv(await readFile('.env','utf8'));
const password=e.UNSAIDBOX_SMTP_PASSWORD_B64?Buffer.from(e.UNSAIDBOX_SMTP_PASSWORD_B64,'base64').toString():e.UNSAIDBOX_SMTP_PASSWORD;
const py=`import sys,json,imaplib,email,ssl,time
c=json.load(sys.stdin)
found=None
for attempt in range(4):
 m=imaplib.IMAP4_SSL('imap.hostinger.com',993,ssl_context=ssl.create_default_context(),timeout=10)
 m.login('hello@unsaidbox.com',c['password']);m.select('INBOX',readonly=True)
 status,data=m.uid('search',None,'HEADER','Subject','"'+c['subject']+'"')
 if status=='OK' and data[0]:
  status,parts=m.uid('fetch',data[0].split()[-1],'(BODY.PEEK[])')
  raw=next((p[1] for p in parts if isinstance(p,tuple)),b'')
  msg=email.message_from_bytes(raw)
  for part in msg.walk():
   if part.get_content_type()=='text/html':
    html=(part.get_payload(decode=True) or b'').decode(part.get_content_charset() or 'utf8',errors='replace')
    found={'received':True,'helpVisible':'Hit reply and tell us' in html,'rawTemplateVisible':'{% if' in html};break
 m.logout()
 if found:break
 time.sleep(2)
print(json.dumps(found))
`;
let previous,changed=false;
try {
 await verifyDigestAttribute(brevo);
 const contact=await brevo(path);assert.ok(contact);previous=contact.attributes?.[digestStageAttribute]??'';
 const draft=JSON.parse(await readFile('docs/email/weekly-digest-preview.json','utf8'));
 const html=renderCampaign(draft,e.UNSAIDBOX_MARKETING_POSTAL_ADDRESS,{digestNudge:'conditional'}).replace('{{ unsubscribe }}','https://unsaidbox.com/dashboard/settings');
 const results=[];
 for(const stage of ['NO_QUESTION','NO_ACCOUNT']){
  await brevo(path,'PUT',{attributes:{[digestStageAttribute]:stage}});changed=true;
  assert.equal((await brevo(path)).attributes?.[digestStageAttribute],stage);
  const subject='[TEST] Digest audience '+stage+' '+Date.now();
  await sendBrevoMail({to:email,subject,html,tag:'unsaidbox-digest-personalization-test'});
  const r=spawnSync('python3',['-c',py],{input:JSON.stringify({password,subject}),encoding:'utf8',timeout:55000});
  if(r.status!==0)throw Error('MAILBOX_CHECK_FAILED');
  const received=JSON.parse(r.stdout);assert.ok(received?.received);assert.equal(received.rawTemplateVisible,false);assert.equal(received.helpVisible,stage==='NO_QUESTION');
  results.push({stage,...received});console.log(stage+' conditional email received and verified.');
 }
 await writeFile('docs/email/digest-personalization-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),results},null,2)+'\n');
} catch{console.error('PERSONALIZATION_TEST_REQUIRES_REVIEW');process.exitCode=1;}
finally{if(changed)await brevo(path,'PUT',{attributes:{[digestStageAttribute]:previous}});}
