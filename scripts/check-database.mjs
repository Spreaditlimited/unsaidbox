import { validateDatabaseUrl } from '../lib/database-url.mjs';

let db;
try {
  const url = validateDatabaseUrl(process.env.UNSAIDBOX_DATABASE_URL);
  const { PrismaClient } = await import('../generated/prisma/index.js');
  db = new PrismaClient({ datasources: { db: { url } } });
  await db.$transaction(async (connection) => {
    const rows = await connection.$queryRaw`SELECT DATABASE() AS name, CURRENT_USER() AS account`;
    const ssl = await connection.$queryRawUnsafe("SHOW SESSION STATUS LIKE 'Ssl_cipher'");
    if (rows[0]?.name !== 'unsaidbox' || !rows[0]?.account.startsWith('unsaidbox_app@')) throw new Error('Unexpected database or account');
    if (!ssl[0]?.Value) throw new Error('No encrypted connection');
    const tables = await connection.$queryRaw`SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'unsaidbox'`;
    console.log(`PASS: dedicated database, restricted username, encrypted connection. ${tables.length} tables present. No data changed.`);
  });
} catch (error) {
  const hints = {
    P1000: 'Login rejected. Check the saved UnsaidBox password.',
    P1001: 'Cannot reach the database server. Check connectivity; do not open the firewall to everyone.',
    P1002: 'Connection timed out.',
    P1011: 'TLS verification failed. We need to configure a trusted CA certificate and matching database hostname. Do not disable certificate validation.',
    P1010: 'The dedicated account does not have access to unsaidbox.',
    ERR_MODULE_NOT_FOUND: 'Run npm run db:generate first.',
  };
  console.error(hints[error.code || error.errorCode] || 'Database check failed. Check dedicated configuration and run npm run db:generate.');
  console.error('No credentials printed and no schema changes attempted.');
  process.exitCode = 1;
} finally {
  await db?.$disconnect();
}
