import test from 'node:test';
import assert from 'node:assert/strict';
import {parseExportFilters,exportScope} from '../lib/export-policy.mjs';
test('private analysis includes legacy responses without consent, while preserving owner and moderation scope',()=>{
  for(const source of ['messages','forms']){
    const w=exportScope('owner',parseExportFilters({source,purpose:'ANALYSIS'}),new Date());
    assert.equal(w.exportPermission,undefined);
    assert.equal(w.sharingPolicy,undefined);
    assert.equal(w.shareAllowed,undefined);
    if(source==='forms') {assert.equal(w.form.allowSharing,undefined);assert.equal(w.form.blocked,false);}
    else assert.deepEqual(w.status,{not:'SPAM'});
    assert.equal(source==='forms'?w.form.accountId:w.accountId,'owner');
  }
});
test('exports whitelist sources, fields and identifiers and require a single form for wide layout',()=>{
  assert.throws(()=>parseExportFilters({source:'followups'}));
  assert.throws(()=>parseExportFilters({source:'forms',layout:'WIDE'}));
  assert.throws(()=>parseExportFilters({source:'messages',sourceId:'../owner'}));
  const f=parseExportFilters({source:'forms',sourceId:'form1',layout:'WIDE',columns:['response','passwordHash','response']});
  assert.deepEqual(f.columns,['response']);
});
test('sharing exports exclude private content and owner scope cannot be supplied by the browser',()=>{
  const f=parseExportFilters({source:'forms',accountId:'attacker',from:'2026-10-01',to:'2026-10-31'});
  const w=exportScope('owner',f,new Date('2026-10-09T12:00:00Z'));
  assert.equal(w.form.accountId,'owner');assert.equal(w.form.allowSharing,true);assert.equal(w.form.blocked,false);assert.equal(w.shareAllowed,true);
  assert.equal(w.createdAt.lt.toISOString(),'2026-10-09T12:00:00.000Z');
});
test('message export prefers searching reviewed public text and requires approval',()=>{
  const w=exportScope('owner',parseExportFilters({source:'messages',q:'example'}),new Date());
  assert.equal(w.status,'APPROVED');assert.equal(w.sharingPolicy,'OWNER_MAY_SHARE');
  assert.deepEqual(w.OR,[{publicBody:{contains:'example'}},{publicBody:null,body:{contains:'example'}}]);
});
