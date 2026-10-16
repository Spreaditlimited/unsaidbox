import test from 'node:test';
import assert from 'node:assert/strict';
import { TunnelSupervisor, sshFailure } from '../scripts/dev-tunnel.mjs';

function fixture() {
  const state = { time: 0, result: 'unreachable', open: false, starts: 0, stops: 0, alive: false, logs: [] };
  const supervisor = new TunnelSupervisor({
    now: () => state.time, probe: async () => state.result, portOpen: async () => state.open,
    log: value => state.logs.push(value),
    launch: onExit => { state.starts++; state.alive = true; state.onExit = onExit; return {
      alive: () => state.alive, stop: async () => { state.stops++; state.alive = false; },
    }; },
  });
  return { state, supervisor };
}
test('missing tunnel starts once, backs off, and recovers after interruption', async () => {
  const { state: s, supervisor: t } = fixture();
  assert.equal(await t.tick(), false); assert.equal(s.starts, 1);
  await t.tick(); assert.equal(s.starts, 1);
  s.time = 2000; s.result = 'ok'; assert.equal(await t.tick(), true);
  s.time = 17000; s.result = 'unreachable'; await t.tick();
  assert.equal(s.stops, 1); assert.equal(s.starts, 2);
  s.time = 19000; s.result = 'ok'; assert.equal(await t.tick(), true);
  await t.stop(); assert.equal(s.stops, 2);
  s.time = 100000; await t.tick(); assert.equal(s.starts, 2);
});
test('working external tunnel is reused and never stopped', async () => {
  const { state: s, supervisor: t } = fixture(); s.result = 'ok'; s.open = true;
  assert.equal(await t.tick(), true); await t.stop();
  assert.equal(s.starts, 0); assert.equal(s.stops, 0);
});
test('unhealthy external tunnel is not killed or replaced while its port is occupied', async () => {
  const { state: s, supervisor: t } = fixture(); s.open = true;
  await t.tick(); assert.equal(s.starts, 0); assert.equal(s.stops, 0);
  s.open = false; s.time = 2000; await t.tick(); assert.equal(s.starts, 1);
});
test('TLS/auth/schema failures do not cause tunnel restart loops', async () => {
  const { state: s, supervisor: t } = fixture(); s.result = 'configuration';
  await t.tick(); assert.equal(s.starts, 0); assert.equal(t.nextCheck, 30000);
});
test('SSH authentication and host-key failures give safe advice and delay retries', async () => {
  assert.equal(sshFailure('Permission denied (publickey).'), 'authentication');
  assert.equal(sshFailure('Host key verification failed.'), 'host-key');
  assert.equal(sshFailure('Connection reset by peer'), 'network');
  const { state: s, supervisor: t } = fixture(); await t.tick();
  s.alive = false; s.onExit('authentication'); assert.equal(t.nextCheck, 30000);
  assert.match(s.logs.at(-1), /ssh-add/);
});
test('shutdown during a health check cannot start a new SSH process', async () => {
  let release; let starts = 0;
  const t = new TunnelSupervisor({ probe: () => new Promise(resolve => { release = resolve; }), portOpen: async () => false, launch: () => { starts++; }, log() {} });
  const pending = t.tick(); await t.stop(); release('unreachable'); await pending;
  assert.equal(starts, 0);
});
