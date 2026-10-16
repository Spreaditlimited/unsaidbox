import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import {validateDatabaseUrl} from '../lib/database-url.mjs';
import {runtimeDatabaseUrl} from '../lib/runtime-database-url.mjs';
import {PrismaClient,Prisma} from '../generated/prisma/index.js';
import {exportScope,parseExportFilters} from '../lib/export-policy.mjs';
const require=createRequire(import.meta.url);
require('@next/env').loadEnvConfig(process.cwd(),true);
const client=new PrismaClient({datasources:{db:{url:runtimeDatabaseUrl(validateDatabaseUrl(process.env.UNSAIDBOX_DATABASE_URL))}}});
try{
  const info=await client.$queryRaw`SELECT DATABASE() AS name`;
  if(info[0]?.name!=='unsaidbox')throw Error('WRONG_DATABASE');
  // Impossible owner ID: validate live SQL shapes without reading customer data.
  const owner='verification-nonexistent-owner';
  for(const source of ['messages','forms'])for(const purpose of ['SHARING','ANALYSIS']){
    const filters=parseExportFilters({source,purpose,reviewStatus:'NEW',starred:'no',tag:'verification'});
    const where=exportScope(owner,filters,new Date());
    const count=await client[source==='forms'?'feedbackEntry':'submission'].count({where});
    if(count!==0)throw Error('UNEXPECTED_DATA');
  }
  await client.accountActivity.findUnique({where:{accountId:owner}});
  await client.exportPreset.findMany({where:{accountId:owner},take:1});
  await client.exportJob.findMany({where:{accountId:owner},take:1});
  await client.administratorCustomerNote.findMany({where:{accountId:owner},take:1});
  await client.billingHistory.findMany({where:{customer:{accountId:owner}},take:1});
  const exports={};
  const modules={'server-only':{},'./db':{db:()=>client},'@/generated/prisma':{Prisma}};
  vm.runInNewContext(ts.transpileModule(await readFile('lib/feedback-insights.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,Intl,require:name=>{if(!(name in modules))throw Error('UNEXPECTED_IMPORT');return modules[name];}});
  const days=await exports.feedbackTrend(owner,'verification-form',new Date('2026-10-01'),new Date('2026-10-03'),'UTC','test',undefined,{reviewStatus:'NEW',starred:'no',tag:'verification'});
  if(days.length!==2||days.some(d=>d.count!==0))throw Error('BAD_TREND');
  console.log('PASS: seven tables and owner-scoped export/review/trend query shapes verified. No customer data read or changed.');
}catch(error){console.error('Customer insights verification failed:',error.code||'CHECK_QUERY_OR_SCHEMA');process.exitCode=1;}
finally{await client.$disconnect();}
