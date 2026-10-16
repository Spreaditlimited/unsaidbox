import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {brevo} from '../lib/brevo.mjs';

// Owner-approved DNS operation, hard-scoped to unsaidbox.com. Infrastructure
// credential is used transiently; no other brand's config is copied into this app.
try {
  const shared=parseEnv(await readFile(new URL('../../effikos/.env.local',import.meta.url),'utf8'));
  const key=shared.EFFIKOS_HOSTINGER_API_TOKEN;
  if(!key)throw Error('HOSTINGER_CREDENTIAL_MISSING');
  const base='https://developers.hostinger.com/api/dns/v1/zones/unsaidbox.com';
  const call=async(method,body,path='')=>{
    const r=await fetch(base+path,{method,headers:{Authorization:'Bearer '+key,'content-type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
    if(!r.ok)throw Error('HOSTINGER_HTTP_'+r.status);
    return r.json();
  };
  const verifyOnly=process.argv.includes('--verify-only');
  const current=await call('GET');
  const before=verifyOnly?JSON.parse(await readFile('.vercel/marketing-activation/dns-before.json','utf8')):current;assert.ok(Array.isArray(before));
  await mkdir('.vercel/marketing-activation',{recursive:true,mode:0o700});
  if(!verifyOnly)await writeFile('.vercel/marketing-activation/dns-before.json',JSON.stringify(before,null,2),{mode:0o600,flag:'wx'});
  const config=JSON.parse(await readFile('docs/email/brevo-domain.json','utf8'));
  const wanted=['brevo_code','dkim1Record','dkim2Record'].map(k=>config.dnsRecords[k]);
  assert.ok(wanted.every(r=>r?.type&&r?.host_name&&r?.value));
  const normalize=s=>String(s).replace(/^"(.*)"$/,'$1').replace(/\.$/,'');
  const additions=[];
  for(const record of wanted){
    const group=before.find(r=>r.name===record.host_name&&r.type===record.type);
    if(group?.records?.some(r=>normalize(r.content)===normalize(record.value)))continue;
    if(record.type==='CNAME'&&group?.records?.length)throw Error('DNS_CONFLICT');
    additions.push({name:record.host_name,type:record.type,ttl:group?.ttl??300,records:[{content:record.value}]});
  }
  if(additions.length&&!verifyOnly){const body={overwrite:false,zone:additions};await call('POST',body,'/validate');await call('PUT',body);}
  const after=await call('GET');
  await writeFile('.vercel/marketing-activation/dns-after.json',JSON.stringify(after,null,2),{mode:0o600});
  for(const original of before){
    const match=after.find(r=>r.name===original.name&&r.type===original.type);
    assert.ok(match,'Existing DNS group missing');assert.equal(match.ttl,original.ttl,'Existing TTL changed');
    for(const r of original.records)assert.ok(match.records.some(a=>JSON.stringify(a)===JSON.stringify(r)),'Existing DNS record changed');
  }
  for(const r of wanted)assert.ok(after.some(a=>a.type===r.type&&a.name===r.host_name&&a.records.some(v=>normalize(v.content)===normalize(r.value))));
  await writeFile('.vercel/marketing-activation/dns-after.json',JSON.stringify(after,null,2),{mode:0o600});
  const env=parseEnv(await readFile('.env','utf8'));
  let authenticated=false;
  try{await brevo('senders/domains/unsaidbox.com/authenticate','PUT',undefined,{env});authenticated=true;}catch{/* Propagation may still be pending; inspect instead of resending. */}
  const domain=await brevo('senders/domains/unsaidbox.com','GET',undefined,{env});
  console.log(JSON.stringify({domain:'unsaidbox.com',recordsAdded:verifyOnly?0:additions.length,existingRecordsPreserved:true,authenticated:domain.authenticated===true,verified:domain.verified===true,authenticationRequested:authenticated}));
}catch(e){console.error('DNS activation stopped:',/^[A-Z_0-9]+$/.test(e?.message??'')?e.message:'VERIFY_STATE_BEFORE_RETRY');process.exitCode=1;}
