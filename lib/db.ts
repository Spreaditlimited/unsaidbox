import "server-only";
import { PrismaClient } from "@/generated/prisma";
import { runtimeDatabaseUrl } from "./runtime-database-url.mjs";
const globalDb = globalThis as unknown as { unsaidboxDb?: PrismaClient };
export function db() {
  return (globalDb.unsaidboxDb ??= new PrismaClient({
    datasources: {
      db: { url: runtimeDatabaseUrl(process.env.UNSAIDBOX_DATABASE_URL) },
    },
  }));
}
