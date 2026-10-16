import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {validateDatabaseUrl} from '../lib/database-url.mjs';
const password=randomBytes(32).toString('hex')+'Aa1!';
const remote=`import sys,json,subprocess,re
cfg=json.load(sys.stdin)
mysql=['mysql','--defaults-file=/etc/mysql/debian.cnf','--batch','--skip-column-names']
if cfg['action']=='create':
 assert len(cfg['password'])==68 and all(c in '0123456789abcdefAa!' for c in cfg['password'])
 existing=subprocess.check_output(mysql+['-e',"SELECT COUNT(*) FROM mysql.user WHERE User='unsaidbox_migration'"],stderr=subprocess.PIPE).decode().strip()
 assert existing=='0','EXISTING_MIGRATION_ACCOUNT'
 sql="CREATE USER 'unsaidbox_migration'@'localhost' IDENTIFIED BY '"+cfg['password']+"' REQUIRE SSL; GRANT SELECT,INSERT,CREATE,REFERENCES,INDEX ON unsaidbox.* TO 'unsaidbox_migration'@'localhost';"
else: sql="DROP USER IF EXISTS 'unsaidbox_migration'@'localhost';"
r=subprocess.run(mysql,input=sql.encode(),stdout=subprocess.PIPE,stderr=subprocess.PIPE)
if r.returncode:
 code=re.search(r'ERROR ([0-9]+)',r.stderr.decode())
 print('MIGRATION_ACCOUNT_OPERATION_FAILED',code.group(1) if code else 'UNKNOWN');sys.exit(1)
print('MIGRATION_ACCOUNT_'+cfg['action'].upper()+'_OK')
`;
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
function account(action){
  const result=spawnSync('ssh',['-i','/Users/tochukwunkwocha/projects/effikos/.vercel/hostinger/effikos_admin','-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','root@195.35.29.41','python3 -c '+quote(remote)],{input:JSON.stringify({action,password}),encoding:'utf8',timeout:30000});
  if(result.status!==0){console.error('Account operation status',result.status, String(result.stdout).trim().slice(0,150),String(result.stderr).replaceAll(password,'[redacted]').trim().split('\n').slice(-1).join('').slice(0,200));throw Error('MIGRATION_ACCOUNT_'+action.toUpperCase()+'_FAILED');}
  console.log(result.stdout.trim());
}
let created=false;
try{
  const url=new URL(validateDatabaseUrl(process.env.UNSAIDBOX_DATABASE_URL));url.username='unsaidbox_migration';url.password=password;
  account('create');created=true;
  const result=spawnSync(process.execPath,['scripts/apply-marketing-migrations.mjs'],{env:{...process.env,UNSAIDBOX_MIGRATION_DATABASE_URL:url.toString()},encoding:'utf8',timeout:120000});
  console.log(result.stdout.trim());if(result.stderr)console.error(result.stderr.trim());if(result.status!==0)throw Error('MIGRATION_FAILED');
}catch(e){console.error(e.message);process.exitCode=1;}
finally{if(created)try{account('drop');}catch{console.error('TEMPORARY_MIGRATION_ACCOUNT_NEEDS_REMOVAL');process.exitCode=1;}}
