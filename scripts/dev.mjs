import nextEnv from '@next/env';
import { spawn } from 'node:child_process';
import { connect } from 'node:net';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { validateDatabaseUrl } from '../lib/database-url.mjs';
import { TunnelSupervisor, sshFailure } from './dev-tunnel.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const log = message => console.log(`[local database ${new Date().toISOString()}] ${message}`);
nextEnv.loadEnvConfig(root, true, { info() {}, error() {} });
let stopping = false;
let app;
let supervisor;
const children = new Set();

function managed(command, args, options = {}) {
  const child = spawn(command, args, { cwd: root, ...options });
  children.add(child);
  child.once('close', () => children.delete(child));
  return child;
}
async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise(resolve => {
    const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
    child.once('close', () => { clearTimeout(timer); resolve(); });
    child.kill('SIGTERM');
  });
}
function portOpen() {
  return new Promise(resolve => {
    const socket = connect({ host: '127.0.0.1', port: 13307 });
    const done = value => { socket.destroy(); resolve(value); };
    socket.setTimeout(1500);
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.once('timeout', () => done(false));
  });
}
function probe() {
  return new Promise(resolve => {
    const child = managed(process.execPath, ['scripts/check-database.mjs'], { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let errors = '';
    child.stdout.resume();
    child.stderr.on('data', data => { errors = (errors + data.toString()).slice(-4000); });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, 20000);
    child.once('error', () => { clearTimeout(timer); resolve('configuration'); });
    child.once('close', code => {
      clearTimeout(timer);
      resolve(code === 0 ? 'ok' : timedOut || /Cannot reach the database server|Connection timed out/.test(errors) ? 'unreachable' : 'configuration');
    });
  });
}
function launch(onExit) {
  // No database/Stripe/email secrets are passed to SSH. No password prompts in
  // background retries. The user unlocks the key in their own SSH agent.
  const env = Object.fromEntries(['PATH', 'HOME', 'SSH_AUTH_SOCK', 'LANG'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
  const child = managed('ssh', [
    '-NT', '-i', join(homedir(), '.ssh', 'unsaidbox_tunnel'),
    '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes',
    '-o', 'StrictHostKeyChecking=yes', '-o', 'ExitOnForwardFailure=yes',
    '-o', 'ConnectTimeout=10', '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=3',
    '-L', '127.0.0.1:13307:127.0.0.1:3307', 'unsaidbox-tunnel@195.35.29.41',
  ], { env, stdio: ['ignore', 'ignore', 'pipe'] });
  let errors = '';
  let intentional = false;
  child.stderr.on('data', data => { errors = (errors + data.toString()).slice(-4000); });
  child.once('error', () => { errors = 'SSH executable unavailable'; });
  child.once('close', () => { if (!intentional) onExit(sshFailure(errors)); });
  return {
    alive: () => child.exitCode === null && child.signalCode === null,
    stop: async () => { intentional = true; await stopChild(child); },
  };
}
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await Promise.all([supervisor?.stop(), ...Array.from(children, stopChild)]);
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void shutdown(); });

try {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw new Error('local-only');
  const url = new URL(validateDatabaseUrl(process.env.UNSAIDBOX_DATABASE_URL));
  const usesTunnel = ['127.0.0.1', 'localhost'].includes(url.hostname) && url.port === '13307';
  if (usesTunnel) {
    supervisor = new TunnelSupervisor({ probe, portOpen, launch, log });
    log('Automatic tunnel recovery enabled. Existing tunnels are preserved. Press Ctrl+C to stop development.');
    while (!stopping && !await supervisor.tick()) await delay(500);
  } else if (await probe() !== 'ok') throw new Error('database-check');
  if (!stopping) {
    app = managed(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', '3001', ...process.argv.slice(2)], { env: process.env, stdio: 'inherit' });
    app.once('error', () => { process.exitCode = 1; void shutdown(); });
    app.once('close', code => { if (!stopping) process.exitCode = code ?? 1; void shutdown(); });
    while (!stopping) {
      await delay(1000);
      if (!stopping) await supervisor?.tick();
    }
  }
} catch {
  console.error('Local development could not start. Run npm run db:check and verify the dedicated local configuration. No credentials printed.');
  process.exitCode = 1;
} finally { await shutdown(); }
