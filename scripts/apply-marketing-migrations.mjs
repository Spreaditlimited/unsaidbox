import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {PrismaClient} from '../generated/prisma/index.js';
import {validateDatabaseUrl} from '../lib/database-url.mjs';
const migrations=[['20261014095000_marketing_consent',['MarketingConsent','MarketingConsentEvent','MarketingControl','MarketingCampaign']],['20261014110000_email_leads',['MarketingLead','MarketingLeadEvent']]];
let client,locked=false;
try{
  const value=process.env.UNSAIDBOX_MIGRATION_DATABASE_URL||process.env.UNSAIDBOX_DATABASE_URL;
  const url=new URL(value);const user=decodeURIComponent(url.username);
  if(process.env.UNSAIDBOX_MIGRATION_DATABASE_URL){if(user!=='unsaidbox_migration')throw Error('MIGRATION_ACCOUNT');const check=new URL(value);check.username='unsaidbox_app';validateDatabaseUrl(check.toString());}
  else validateDatabaseUrl(value);
  url.searchParams.set('connection_limit','1');
  client=new PrismaClient({datasources:{db:{url:url.toString()}}});
  const identity=await client.$queryRawUnsafe('SELECT DATABASE() AS name,CURRENT_USER() AS account');
  const ssl=await client.$queryRawUnsafe("SHOW SESSION STATUS LIKE 'Ssl_cipher'");
  if(identity[0]?.name!=='unsaidbox'||!identity[0]?.account.startsWith(user+'@')||!ssl[0]?.Value)throw Error('DATABASE_SCOPE');
  const granted=JSON.stringify(await client.$queryRawUnsafe('SHOW GRANTS'));
  if(!/ALL PRIVILEGES|CREATE/.test(granted))throw Error('SCOPED_DDL_PERMISSION_REQUIRED');
  const lock=await client.$queryRawUnsafe("SELECT GET_LOCK('unsaidbox:marketing-migrations',10) AS acquired");
  if(Number(lock[0]?.acquired)!==1)throw Error('MIGRATION_LOCK');locked=true;
  await mkdir('.vercel/marketing-activation',{recursive:true,mode:0o700});
  const tables=await client.$queryRawUnsafe("SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA='unsaidbox'");
  const schema=[];
  for(const table of tables){if(!/^[a-zA-Z0-9_]+$/.test(table.name))throw Error('TABLE_NAME');schema.push(await client.$queryRawUnsafe('SHOW CREATE TABLE `'+table.name+'`'));}
  await writeFile('.vercel/marketing-activation/schema-before.json',JSON.stringify(schema,null,2),{mode:0o600,flag:'wx'});
  const report=[];
  for(const [name,names] of migrations){
    const sql=await readFile(`prisma/migrations/${name}/migration.sql`,'utf8');const checksum=createHash('sha256').update(sql).digest('hex');
    const previous=await client.$queryRawUnsafe('SELECT checksum,finished_at,rolled_back_at FROM _prisma_migrations WHERE migration_name=?',name);
    if(previous.length){if(previous.length!==1||previous[0].checksum!==checksum||!previous[0].finished_at||previous[0].rolled_back_at)throw Error('MIGRATION_HISTORY_CONFLICT');report.push({name,alreadyApplied:true});continue;}
    for(const table of names)if(tables.some(t=>t.name===table))throw Error('PARTIAL_SCHEMA_INSPECT_BEFORE_RETRY');
    const statements=sql.replace(/^--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean);
    if(statements.some(s=>!/^CREATE TABLE `Marketing[A-Za-z]+`/.test(s)&&!/^INSERT INTO `MarketingControl`/.test(s)))throw Error('UNEXPECTED_SQL');
    for(const statement of statements)await client.$executeRawUnsafe(statement);
    for(const table of names){const count=await client.$queryRawUnsafe('SELECT COUNT(*) AS count FROM `'+table+'`');if(Number(count[0].count)!==(table==='MarketingControl'?1:0))throw Error('UNEXPECTED_INITIAL_ROWS');}
    await client.$executeRawUnsafe('INSERT INTO _prisma_migrations (id,checksum,finished_at,migration_name,started_at,applied_steps_count) VALUES (?,?,NOW(3),?,NOW(3),1)',randomUUID(),checksum,name);
    report.push({name,tablesCreated:names.length,checksum});
  }
  await writeFile('docs/email/migration-result.json',JSON.stringify({appliedAt:new Date().toISOString(),database:'unsaidbox',existingDataModified:false,migrations:report},null,2)+'\n');
  console.log(JSON.stringify({database:'unsaidbox',existingDataModified:false,migrations:report}));
}catch(e){console.error('Migration stopped:',/^[A-Z_]+$/.test(e?.message??'')?e.message:e?.code??'INSPECT_PARTIAL_STATE_BEFORE_RETRY');process.exitCode=1;}
finally{if(locked)await client.$queryRawUnsafe("SELECT RELEASE_LOCK('unsaidbox:marketing-migrations')").catch(()=>{});await client?.$disconnect();}
