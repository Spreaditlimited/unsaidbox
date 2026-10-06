// Configure this Mac's development connection. Never changes the VPS.
import { readFile, writeFile, rename, lstat, access } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import { validateDatabaseUrl } from '../lib/database-url.mjs';

try {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    throw new Error('Development configuration only.');
  }
  const envFile = new URL('../.env', import.meta.url);
  if (!(await lstat(envFile)).isFile()) throw new Error('Expected a regular .env file.');
  const source = await readFile(envFile, 'utf8');
  const url = new URL(validateDatabaseUrl(parseEnv(source).UNSAIDBOX_DATABASE_URL));
  const ca = fileURLToPath(new URL('../certificates/mysql-ca.pem', import.meta.url));
  await access(ca);
  url.hostname = '127.0.0.1';
  url.port = '13307';
  url.searchParams.set('sslcert', ca);
  const value = validateDatabaseUrl(url.toString());
  const pattern = /^(?:export\s+)?UNSAIDBOX_DATABASE_URL=[^\r\n]*$/gm;
  if ([...source.matchAll(pattern)].length !== 1) throw new Error('Expected one single-line database setting.');
  const updated = source.replace(pattern, () => `UNSAIDBOX_DATABASE_URL=${JSON.stringify(value)}`);
  if (updated !== source) {
    // Refuse to overwrite an existing backup or temporary file.
    await writeFile(new URL('../.env.before-tunnel', import.meta.url), source, { flag: 'wx', mode: 0o600 });
    const temporary = new URL('../.env.tunnel-next', import.meta.url);
    await writeFile(temporary, updated, { flag: 'wx', mode: 0o600 });
    await rename(temporary, envFile);
  }
  console.log('Development connection saved: SSH tunnel on 127.0.0.1:13307, strict TLS, trusted CA.');
  console.log('Original configuration retained in .env.before-tunnel. No credentials printed.');
} catch {
  console.error('Configuration not completed. Check file permissions, existing backup files, and dedicated database settings. No credentials printed.');
  process.exitCode = 1;
}
