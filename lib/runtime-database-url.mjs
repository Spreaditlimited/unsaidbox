import { resolve } from 'node:path';
import { accessSync, constants } from 'node:fs';
import { validateDatabaseUrl } from './database-url.mjs';

// The public CA is bundled with server functions, never a Mac-specific path.
export function runtimeDatabaseUrl(value, env = process.env, cwd = process.cwd()) {
  const validated = validateDatabaseUrl(value);
  if (env.VERCEL !== '1') return validated;
  const certificate = resolve(cwd, 'certificates/mysql-ca.pem');
  accessSync(certificate, constants.R_OK);
  const url = new URL(validated);
  url.searchParams.set('sslcert', certificate);
  return validateDatabaseUrl(url.toString());
}
