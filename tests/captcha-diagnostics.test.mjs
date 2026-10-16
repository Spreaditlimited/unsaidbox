import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyCaptcha } from '../lib/captcha.mjs';

const env = {
  VERCEL: '1', VERCEL_ENV: 'production', UNSAIDBOX_APP_URL: 'https://unsaidbox.com',
  UNSAIDBOX_RECAPTCHA_SITE_KEY: 'private-site-key', UNSAIDBOX_RECAPTCHA_SECRET: 'private-secret',
};
const good = () => ({success:true, hostname:'unsaidbox.com', action:'saveResponse', score:0.9, challenge_ts:new Date().toISOString()});
const form = () => { const data = new FormData(); data.set('captchaToken', 'private-token-'.repeat(5)); data.set('body', 'private submission'); return data; };
async function check(result, options = {}) {
  const logs = [];
  const run = verifyCaptcha(form(), 'saveResponse', {env, request:async()=>({ok:true,json:async()=>result}), log:(...args)=>logs.push(args), ...options});
  return {run, logs};
}

test('CAPTCHA diagnostics identify each rejection without weakening verification', async () => {
  const cases = [
    [{score:0.1}, 'score_below_threshold'],
    [{hostname:'wrong.example'}, 'hostname_mismatch'],
    [{action:'createQuestion'}, 'action_mismatch'],
    [{success:false,'error-codes':['timeout-or-duplicate']}, 'provider_rejected'],
    [{score:null}, 'score_invalid'],
    [{challenge_ts:'invalid'}, 'timestamp_invalid'],
    [{challenge_ts:new Date(Date.now()+60000).toISOString()}, 'timestamp_in_future'],
  ];
  for (const [override, reason] of cases) {
    const {run,logs} = await check({...good(),...override});
    await assert.rejects(run, /security check did not accept/);
    assert.equal(logs.length,1);
    assert.equal(logs[0][0],'captcha_verification_failed');
    assert.deepEqual(logs[0][1].reasons,[reason]);
    assert.equal(logs[0][1].action,'saveResponse');
  }
});

test('fresh Google-accepted tokens remain valid after the dashboard challenge has aged', async () => {
  for (const minutes of [3, 30, 180]) {
    const {run,logs} = await check({...good(),score:1,challenge_ts:new Date(Date.now()-minutes*60000).toISOString()});
    await run;
    assert.equal(logs.length,0);
  }
});

test('Google expiry and replay failures remain rejected, regardless of challenge age', async () => {
  for (const minutes of [0, 30]) {
    const {run,logs} = await check({...good(),success:false,challenge_ts:new Date(Date.now()-minutes*60000).toISOString(),'error-codes':['timeout-or-duplicate']});
    await assert.rejects(run,/security check did not accept/);
    assert.deepEqual(logs[0][1].reasons,['provider_rejected']);
    assert.deepEqual(logs[0][1].providerCodes,['timeout-or-duplicate']);
  }
  let calls=0;
  const request=async()=>({ok:true,json:async()=>++calls===1 ? good() : {success:false,'error-codes':['timeout-or-duplicate']}});
  await verifyCaptcha(form(),'saveResponse',{env,request,log:()=>{}});
  await assert.rejects(verifyCaptcha(form(),'saveResponse',{env,request,log:()=>{}}));
  assert.equal(calls,2,'every attempt must be independently verified with Google');
});

test('CAPTCHA diagnostics exclude secrets, content and untrusted provider strings', async () => {
  const sentinel = 'DO_NOT_LOG_PRIVATE_DATA';
  const {run,logs} = await check({...good(),success:false,hostname:sentinel,action:sentinel,extra:sentinel,'error-codes':[sentinel,'invalid-input-secret']});
  await assert.rejects(run);
  const output = JSON.stringify(logs);
  for (const privateValue of [sentinel,'private-token','private-secret','private-site-key','private submission']) assert.ok(!output.includes(privateValue));
  assert.deepEqual(logs[0][1].providerCodes,['invalid-input-secret']);
});

test('CAPTCHA diagnostics handle transport/config/token/malformed failures safely', async () => {
  for (const [options,reason] of [
    [{env:{...env,UNSAIDBOX_RECAPTCHA_SECRET:''}},'configuration_invalid'],
    [{request:async()=>{throw Error('private-network-error');}},'provider_unavailable'],
  ]) {
    const {run,logs} = await check(good(),options);
    await assert.rejects(run);
    assert.deepEqual(logs[0][1].reasons,[reason]);
    assert.ok(!JSON.stringify(logs).includes('private-network-error'));
  }
  for (const result of [null,[],42]) {
    const {run,logs} = await check(result);
    await assert.rejects(run);
    assert.deepEqual(logs[0][1].reasons,['provider_response_malformed']);
  }
  const logs=[];
  await assert.rejects(verifyCaptcha(new FormData(),'saveResponse',{env,log:(...args)=>logs.push(args)}));
  assert.deepEqual(logs[0][1].reasons,['token_missing_or_malformed']);
});

test('successful and local checks are silent; broken logging never permits a rejection', async () => {
  const success=await check(good()); await success.run; assert.equal(success.logs.length,0);
  const local=await check(null,{env:{NODE_ENV:'development'},request:async()=>assert.fail('must bypass locally')});
  await local.run; assert.equal(local.logs.length,0);
  const failed=await check({...good(),score:0.1},{log:()=>{throw Error('logger failed');}});
  await assert.rejects(failed.run,/security check did not accept/);
});
