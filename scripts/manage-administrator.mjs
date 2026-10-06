import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { PrismaClient } from "../generated/prisma/index.js";
import { validateDatabaseUrl } from "../lib/database-url.mjs";
import { hashPassword, textValue, InputError } from "../lib/security.mjs";

let rl, client, muted = false;
const output = new Writable({ write(chunk, encoding, done) { if (!muted) process.stdout.write(chunk, encoding); done(); } });
try {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new InputError("Run this command in your own terminal. Never paste passwords into chat.");
  const operation = process.argv[2];
  if (!["create", "reset"].includes(operation)) throw new InputError("Choose admin:create or admin:reset-password.");
  rl = createInterface({ input: process.stdin, output, terminal: true, historySize: 0 });
  rl.on("SIGINT", () => { process.stdout.write("\nCancelled.\n"); process.exit(130); });
  console.log("Dedicated UnsaidBox administrator management. Personal accounts are not modified.");
  const email = textValue(await rl.question("Administrator email: "), "Email", 254).toLowerCase();
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)) throw new InputError("Enter a valid email address.");
  const displayName = operation === "create" ? textValue(await rl.question("Display name: "), "Display name", 80) : undefined;
  async function secret(prompt) {
    process.stdout.write(prompt);
    muted = true;
    try { return await rl.question(""); }
    finally { muted = false; process.stdout.write("\n"); }
  }
  const password = await secret("New administrator password (12–128 characters, hidden): ");
  if (password !== await secret("Confirm password (hidden): ")) throw new InputError("Passwords do not match.");
  const passwordHash = await hashPassword(password);
  if (await rl.question(`Type ${operation.toUpperCase()} to ${operation} this administrator in the configured database: `) !== operation.toUpperCase()) throw new InputError("Cancelled without changes.");
  client = new PrismaClient({ datasources: { db: { url: validateDatabaseUrl(process.env.UNSAIDBOX_DATABASE_URL) } } });
  await client.$transaction(async tx => {
    const existing = await tx.administrator.findUnique({ where: { email } });
    if (operation === "create" && existing) throw new InputError("Administrator already exists; use admin:reset-password for recovery.");
    if (operation === "reset" && !existing) throw new InputError("Administrator not found.");
    if (existing && !existing.active) throw new InputError("This administrator is disabled; password recovery does not reactivate it.");
    const administrator = operation === "create"
      ? await tx.administrator.create({ data: { email, displayName, passwordHash } })
      : await tx.administrator.update({ where: { id: existing.id }, data: { passwordHash } });
    await tx.administratorSession.deleteMany({ where: { administratorId: administrator.id } });
    await tx.auditEvent.create({ data: { actorId: administrator.id, targetId: administrator.id, action: operation === "create" ? "admin:provision" : "admin:password-recovery" } });
  });
  console.log("Administrator saved. Sign in at /admin/login. No personal account or user session was changed.");
} catch (error) {
  console.error(error instanceof InputError ? error.message : "Administrator setup failed. Check the database connection and install the separate-administration tables first. No credentials printed.");
  process.exitCode = 1;
} finally { rl?.close(); await client?.$disconnect(); }
