import {spawnSync} from 'node:child_process';
import {readFile,chmod} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomBytes} from 'node:crypto';
const cli='/private/tmp/effikos-vercel-cli/node_modules/.bin/vercel';
const project=JSON.parse(await readFile('.vercel/project.json','utf8'));
if(project.projectId!=='prj_hj6f1UVHZzQikHow32P9w4RpPdmy')throw Error('WRONG_PROJECT');
const scope=['--scope','tochukwu-nkwochas-projects'];
const file='.vercel/marketing-activation/digest-production.env';
const pulled=spawnSync(cli,['env','pull',file,'--environment','production','--yes',...scope],{encoding:'utf8',timeout:30000});
if(pulled.status!==0)throw Error('ENV_READ_FAILED');
await chmod(file,0o600);
const env=parseEnv(await readFile(file,'utf8'));
const values={UNSAIDBOX_WEEKLY_DIGEST_ENABLED:'true'};
if(!env.CRON_SECRET)values.CRON_SECRET=randomBytes(32).toString('hex');
else if(env.CRON_SECRET!=='[SENSITIVE]'&&env.CRON_SECRET.length<32)throw Error('EXISTING_CRON_SECRET_TOO_SHORT');
for(const [key,value] of Object.entries(values)){
 const r=spawnSync(cli,['env','add',key,'production','--type',key==='CRON_SECRET'?'secret':'config','--force','--yes','--project',project.projectId,...scope],{input:value,encoding:'utf8',timeout:30000});
 if(r.status!==0)throw Error('ENV_WRITE_FAILED');
 console.log('Configured '+key);
}
