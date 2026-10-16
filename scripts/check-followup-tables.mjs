import { PrismaClient } from '../generated/prisma/index.js';
import { runtimeDatabaseUrl } from '../lib/runtime-database-url.mjs';
let client;
try {
  client = new PrismaClient({ datasources: { db: { url: runtimeDatabaseUrl(process.env.UNSAIDBOX_DATABASE_URL) } } });
  const rows = await client.$queryRaw`SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'unsaidbox' AND TABLE_NAME IN ('FollowupConversation', 'FollowupMessage')`;
  console.log(JSON.stringify({ tables: rows.map(r => r.name), ready: rows.length === 2, dataChanged: false }));
} catch (error) {
  console.error('Follow-up table check failed.', { code: error.code ?? 'UNKNOWN' });
  process.exitCode = 1;
} finally { await client?.$disconnect(); }
