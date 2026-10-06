import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { access, open, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { buildDatabaseUrl } from '../lib/database-url.mjs';

const destination = fileURLToPath(new URL('../.env', import.meta.url));
let rl;
let muted = false;
let file;
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) process.stdout.write(chunk, encoding);
    callback();
  },
});

try {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Run this command in your Mac Terminal, not in chat or a redirected shell.');
  try {
    await access(destination, constants.F_OK);
    throw new Error('An .env file already exists. It was not overwritten. Ask for help updating it safely.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  rl = createInterface({ input: process.stdin, output, terminal: true, historySize: 0 });
  rl.on('SIGINT', () => { muted = false; process.stdout.write('\nCancelled.\n'); rl.close(); process.exit(130); });
  const host = (await rl.question('Database server [195.35.29.41]: ')).trim() || '195.35.29.41';
  const certInput = (await rl.question('CA certificate file on this Mac (Enter to use system trust): ')).trim();
  let certificate = '';
  if (certInput) {
    certificate = resolve(certInput);
    const pem = await readFile(certificate, 'utf8');
    if (!pem.includes('-----BEGIN CERTIFICATE-----') || pem.includes('PRIVATE KEY')) {
      throw new Error('Use a public CA certificate, never a private key.');
    }
  }
  process.stdout.write('Saved database password (input hidden): ');
  muted = true;
  const password = await rl.question('');
  muted = false;
  process.stdout.write('\nConfirm database password (input hidden): ');
  muted = true;
  const confirmation = await rl.question('');
  muted = false;
  process.stdout.write('\n');
  if (password !== confirmation) throw new Error('Passwords did not match. No file was created. Try again.');
  const url = buildDatabaseUrl({ host, password, certificate });
  // Exclusive creation prevents overwriting any existing credentials; owner-only access.
  file = await open(destination, 'wx', 0o600);
  await file.writeFile(`UNSAIDBOX_DATABASE_URL="${url}"\n`, 'utf8');
  console.log('Saved privately in UnsaidBox .env. No database connection or changes made.');
  console.log('Certificate validation is enabled. Next run: npm run db:check');
} catch (error) {
  muted = false;
  // Never print raw errors from filesystem or URL parsers: those may contain input.
  const safeMessages = [
    'Run this command in your Mac Terminal, not in chat or a redirected shell.',
    'An .env file already exists. It was not overwritten. Ask for help updating it safely.',
    'Use a public CA certificate, never a private key.',
    'Passwords did not match. No file was created. Try again.',
    'Enter only the database hostname or IPv4 address.',
    'Enter a password without line breaks.',
  ];
  console.error(safeMessages.includes(error.message) ? error.message : 'Setup could not finish. Check the certificate path and folder permissions. No credentials printed.');
  process.exitCode = 1;
} finally {
  rl?.close();
  await file?.close();
}
