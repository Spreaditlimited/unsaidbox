import { resolve } from 'node:path';
import { accessSync, constants } from 'node:fs';
import { validateDatabaseUrl } from './database-url.mjs';

// The public CA is bundled with server functions, never a Mac-specific path.
export function runtimeDatabaseUrl(value, env = process.env, cwd = process.cwd()) {
  const validated = validateDatabaseUrl(value);
  const url = new URL(validated);
  // Every warm function owns its own pool. Router's global limit is not a
  // substitute for bounding each pool; CPU-derived defaults amplify scale-out.
  const maximum = env.VERCEL === '1' ? 1 : 3;
  for (const [name, ceiling] of Object.entries({
    connection_limit: maximum,
    connect_timeout: 10,
    pool_timeout: 10,
    max_idle_connection_lifetime: 30,
  })) {
    const values = url.searchParams.getAll(name);
    const supplied = values.length === 1 && /^[1-9]\d*$/.test(values[0]) ? Number(values[0]) : ceiling;
    url.searchParams.set(name, String(Math.min(supplied, ceiling)));
  }
  if (env.VERCEL === '1') {
    const certificate = resolve(cwd, 'certificates/mysql-ca.pem');
    accessSync(certificate, constants.R_OK);
    url.searchParams.set('sslcert', certificate);
  }
  return validateDatabaseUrl(url.toString());
}
