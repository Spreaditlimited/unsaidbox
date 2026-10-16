import nextEnv from '@next/env';
import Stripe from 'stripe';
import {PrismaClient} from '../generated/prisma/index.js';
import {runtimeDatabaseUrl} from '../lib/runtime-database-url.mjs';
import {billingEnvironment} from '../lib/billing-runtime.mjs';
import {repairAllowanceAnchors} from '../lib/repair-allowance-anchor.mjs';
nextEnv.loadEnvConfig(process.cwd(),true,{info(){},error(){}});
const {mode,key}=billingEnvironment();
if(mode!=='test')throw Error('This repair script is restricted to test subscriptions.');
const client=new PrismaClient({datasources:{db:{url:runtimeDatabaseUrl(process.env.UNSAIDBOX_DATABASE_URL)}}});
try{
  const rows=await client.billingSubscription.findMany({where:{mode,recognized:true,status:{in:['active','past_due']},paidThrough:{gt:new Date()},allowanceAnchor:null},select:{customer:{select:{accountId:true}}},take:2});
  if(rows.length!==1)throw Error('Expected exactly one affected test subscription; review scope before proceeding.');
  const repaired=await repairAllowanceAnchors({client,stripe:new Stripe(key,{timeout:10000,maxNetworkRetries:0}),mode,accountId:rows[0].customer.accountId,actorId:'system:anchor-repair'});
  console.log(JSON.stringify({mode,repaired,usageCountersChanged:false,stripeWrites:false}));
}catch(error){console.error('Allowance repair failed:',/^ALLOWANCE_[A-Z_]+$/.test(error.message)?error.message:'CHECK_STRIPE_OR_DATABASE');process.exitCode=1;}
finally{await client.$disconnect();}
