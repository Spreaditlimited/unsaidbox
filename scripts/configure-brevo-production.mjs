import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {spawnSync} from 'node:child_process';
import {assertSender} from '../lib/brevo.mjs';
import {PrismaClient} from '../generated/prisma/index.js';
import {validateDatabaseUrl} from '../lib/database-url.mjs';
let client;
try{
 const project=JSON.parse(await readFile('.vercel/project.json','utf8'));
 if(project.projectId!=='prj_hj6f1UVHZzQikHow32P9w4RpPdmy'||project.orgId!=='team_dXMk2WoyygCeflKqvhZ0Uio4')throw Error('WRONG_PROJECT');
 await assertSender();
 client=new PrismaClient({datasources:{db:{url:validateDatabaseUrl(process.env.UNSAIDBOX_DATABASE_URL)}}});
 await Promise.all([client.marketingConsent.count(),client.marketingCampaign.count(),client.marketingLead.count(),client.marketingLeadEvent.count(),client.marketingConsentEvent.count()]);
 if(!(await client.marketingControl.findUnique({where:{id:1}})))throw Error('CONTROL_ROW_MISSING');
 const e=parseEnv(await readFile('.env','utf8'));
 const values=Object.fromEntries(['UNSAIDBOX_BREVO_API_KEY','UNSAIDBOX_BREVO_FOLDER_ID','UNSAIDBOX_BREVO_MARKETING_LIST_ID','UNSAIDBOX_MARKETING_POSTAL_ADDRESS'].map(k=>{if(!e[k])throw Error('MISSING_CONFIG');return [k,e[k]];}));
 Object.assign(values,{UNSAIDBOX_MARKETING_ENABLED:'true',UNSAIDBOX_EMAIL_LEADS_ENABLED:'true',UNSAIDBOX_MAIL_PROVIDER:'brevo'});
 for(const [key,value] of Object.entries(values)){
  const r=spawnSync('/private/tmp/effikos-vercel-cli/node_modules/.bin/vercel',['env','add',key,'production','--type',key.endsWith('API_KEY')?'secret':'config','--force','--yes','--project',project.projectId,'--scope','tochukwu-nkwochas-projects'],{input:value,encoding:'utf8',timeout:30000});
  if(r.status!==0)throw Error('PRODUCTION_ENV_UPLOAD_FAILED_'+key);
  console.log('Saved production '+key);
 }
 console.log('Production marketing configuration ready. No deployment or email sent by this script.');
}catch(e){console.error(/^[A-Z_]+$/.test(e?.message??'')?e.message:'PRODUCTION_CONFIG_STOPPED');process.exitCode=1;}
finally{await client?.$disconnect();}
