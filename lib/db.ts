import "server-only";
import { PrismaClient } from "@/generated/prisma";
import { validateDatabaseUrl } from "./database-url.mjs";
const globalDb = globalThis as unknown as { unsaidboxDb?: PrismaClient };
export function db() {
  return (globalDb.unsaidboxDb ??= new PrismaClient({
    datasources: {
      db: { url: validateDatabaseUrl(process.env.UNSAIDBOX_DATABASE_URL) },
    },
  }));
}
