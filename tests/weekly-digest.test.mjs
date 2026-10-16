import test from 'node:test';
import assert from 'node:assert/strict';
import {digestSlot,digestId,buildDigest,cronAuthorized,runWeeklyDigest} from '../lib/weekly-digest.mjs';
import {renderCampaign} from '../lib/marketing-policy.mjs';
test('Sunday six pm follows UK daylight saving, including transition Sundays',()=>{
 for(const date of ['2026-10-18T17:00:00Z','2026-10-25T18:00:00Z','2027-03-28T17:00:00Z'])assert.equal(digestSlot(new Date(date)).due,true);
 for(const date of ['2026-10-18T18:00:00Z','2026-10-25T17:00:00Z','2026-10-19T17:00:00Z'])assert.equal(digestSlot(new Date(date)).due,false);
 assert.equal(digestId('2026-10-18'),digestId('2026-10-18'));assert.notEqual(digestId('2026-10-18'),digestId('2026-10-25'));
});
test('cron requires strong exact secret',()=>{assert.equal(cronAuthorized('Bearer '+ 'a'.repeat(32),'a'.repeat(32)),true);assert.equal(cronAuthorized('Bearer undefined'),false);assert.equal(cronAuthorized('Bearer short','short'),false);assert.equal(cronAuthorized('bad','a'.repeat(32)),false);});
test('digest invites readers to real blog links and escapes editorial content',()=>{
 const d=buildDigest([{title:'Try <this>',excerpt:'One useful idea.',slug:'better-questions'}]);
 const html=renderCampaign({...d,createdBy:'system:weekly-digest'},'Business address');
 assert.match(d.body,/Hi there/);assert.match(html,/href="https:\/\/unsaidbox.com\/blog\/better-questions"/);assert.match(html,/Try &lt;this&gt;/);assert.ok(!html.includes('>Open UnsaidBox</a>'));assert.match(html,/\{\{ unsubscribe \}\}/);
 assert.throws(()=>buildDigest([]));assert.throws(()=>buildDigest([{title:'x',excerpt:'x',slug:'../private'}]));
});
test('off schedule performs no database or sender work',async()=>{assert.deepEqual(await runWeeklyDigest({}, {env:{UNSAIDBOX_MARKETING_ENABLED:'true',UNSAIDBOX_WEEKLY_DIGEST_ENABLED:'true'},now:new Date('2026-10-14T18:00:00Z')}),{status:'outside-schedule'});});
test('duplicate cron invocations send only once and skip empty audience permanently',async()=>{
 const rows=new Map();let sends=0;let lock=Promise.resolve();const client={blogPost:{findMany:async()=>[{title:'One idea',excerpt:'A useful question.',slug:'one-idea'}]},marketingCampaign:{findUnique:async({where})=>rows.get(where.id),create:async({data})=>rows.set(data.id,data),updateMany:async({where,data})=>Object.assign(rows.get(where.id),data)},marketingControl:{update:async()=>{}}};
 client.$transaction=async work=>{const before=lock;let release;lock=new Promise(r=>release=r);await before;try{return await work(client);}finally{release();}};
 const options={now:new Date('2026-10-18T17:00:00Z'),env:{UNSAIDBOX_MARKETING_ENABLED:'true',UNSAIDBOX_WEEKLY_DIGEST_ENABLED:'true'},send:async()=>{sends++;throw Error('EMPTY_AUDIENCE');}};
 const results=await Promise.all([runWeeklyDigest(client,options),runWeeklyDigest(client,options)]);
 assert.equal(sends,1);assert.ok(results.some(r=>r.status==='no-subscribers'));assert.equal([...rows.values()][0].status,'SKIPPED');
});
test('publication windows meet exactly across UK clock changes',async()=>{
 const {digestPosts}=await import('../lib/weekly-digest.mjs');let query;
 const client={blogPost:{findMany:async q=>{query=q;return [];}}};
 await digestPosts(client,new Date('2026-10-25T18:02:00Z'));
 assert.equal(query.where.publishAt.gt.toISOString(),'2026-10-18T17:00:00.000Z');
 assert.equal(query.where.publishAt.lte.toISOString(),'2026-10-25T18:00:00.000Z');
 assert.equal(query.where.published,true);
});
