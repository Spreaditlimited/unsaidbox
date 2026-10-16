import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import assert from 'node:assert/strict';
const env=parseEnv(await readFile('../effikos/.env.local','utf8'));
const base='https://developers.hostinger.com/api/dns/v1/zones/unsaidbox.com';
async function call(method,body,path=''){
 const r=await fetch(base+path,{method,headers:{Authorization:'Bearer '+env.EFFIKOS_HOSTINGER_API_TOKEN,'content-type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('DNS_HTTP_'+r.status);return r.json();
}
try{
 const before=await call('GET');const d=before.find(r=>r.type==='TXT'&&r.name==='_dmarc');
 assert.equal(d?.records.length,1);const old=d.records[0].content.replace(/^"(.*)"$/,'$1');
 assert.ok(/^v=DMARC1;\s*p=none\s*;?$/.test(old)||old.includes('rua=mailto:rua@dmarc.brevo.com'));
 await writeFile('.vercel/marketing-activation/dmarc-before.json',JSON.stringify(before,null,2),{mode:0o600,flag:'wx'});
 if(!old.includes('rua=')){
  const body={overwrite:true,zone:[{name:'_dmarc',type:'TXT',ttl:d.ttl,records:[{content:old.replace(/;?\s*$/,'')+'; rua=mailto:rua@dmarc.brevo.com'}]}]};
  await call('POST',body,'/validate');await call('PUT',body);
 }
 console.log('DMARC reporting address added; p=none and the existing TTL retained. No other record targeted.');
}catch{console.error('DMARC_UPDATE_STOPPED_VERIFY_STATE');process.exitCode=1;}
