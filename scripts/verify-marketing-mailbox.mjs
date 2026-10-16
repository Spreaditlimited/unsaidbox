import {spawnSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
const e=parseEnv(await readFile('.env','utf8'));
const campaign=process.argv.includes('--campaign');
const production=process.argv.includes('--production-confirmation');
const password=e.UNSAIDBOX_SMTP_PASSWORD_B64?Buffer.from(e.UNSAIDBOX_SMTP_PASSWORD_B64,'base64').toString('utf8'):e.UNSAIDBOX_SMTP_PASSWORD;
const py=`import sys,json,imaplib,email,re,ssl
cfg=json.load(sys.stdin)
m=imaplib.IMAP4_SSL('imap.hostinger.com',993,ssl_context=ssl.create_default_context(),timeout=20)
m.login('hello@unsaidbox.com',cfg['password']);m.select('INBOX',readonly=True)
subject='[TEST] One question to get more useful feedback' if cfg['campaign'] else 'Confirm your UnsaidBox email updates'
status,data=m.uid('search',None,'HEADER','Subject','"'+subject+'"')
found=None
if status=='OK':
 for uid in reversed(data[0].split()[-5:]):
  status,parts=m.uid('fetch',uid,'(BODY.PEEK[])')
  raw=next((p[1] for p in parts if isinstance(p,tuple)),b'')
  msg=email.message_from_bytes(raw)
  if cfg['campaign']:
   found={'messageId':msg.get('Message-ID'),'date':msg.get('Date')}
   for part in msg.walk():
    if part.get_content_type()=='text/html':found['html']=(part.get_payload(decode=True) or b'').decode(part.get_content_charset() or 'utf8',errors='replace');break
   break
  for part in msg.walk():
   if part.get_content_type() not in ['text/plain','text/html']:continue
   body=(part.get_payload(decode=True) or b'').decode(part.get_content_charset() or 'utf8',errors='replace')
   pattern=r'https://unsaidbox.com/updates/confirm#([a-f0-9]{64})' if cfg['production'] else r'http://localhost:3001/updates/confirm#([a-f0-9]{64})'
   match=re.search(pattern,body)
   if match:found={'token':match.group(1),'messageId':msg.get('Message-ID'),'date':msg.get('Date')};break
  if found:break
m.logout()
print(json.dumps(found))
`;
try{
 if(!password)throw Error('MAILBOX_CREDENTIAL_MISSING');
 const r=spawnSync('python3',['-c',py],{input:JSON.stringify({password,campaign,production}),encoding:'utf8',timeout:40000});
 if(r.status!==0)throw Error('MAILBOX_CHECK_FAILED');
 const result=JSON.parse(r.stdout);
 if(!result)throw Error('CONFIRMATION_NOT_YET_IN_INBOX');
 await writeFile('.vercel/marketing-activation/'+(campaign?'test-campaign-received.json':production?'production-test-confirmation.json':'test-confirmation.json'),JSON.stringify(result),{mode:0o600});
 if(campaign&&result.html)await writeFile('.vercel/marketing-activation/received-campaign.html',result.html,{mode:0o600});
 console.log(JSON.stringify({type:campaign?'campaign-test':'confirmation',received:true,mailbox:'hello@unsaidbox.com',date:result.date,privateDataStoredPrivately:true}));
}catch(error){console.error(error.message);process.exitCode=1;}
