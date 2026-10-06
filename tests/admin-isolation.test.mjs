import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import { digest } from "../lib/security.mjs";

async function authFixture() {
  const cookies = new Map();
  const rows = new Map();
  const writes = [];
  let lookups = 0;
  const model = {
    async findUnique({ where }) { lookups++; return rows.get(where.tokenHash) ?? null; },
    async create({ data }) { rows.set(data.tokenHash, data); },
    async deleteMany({ where }) { rows.delete(where.tokenHash); },
  };
  const database = { administratorSession: model, $transaction: fn => fn(database) };
  const exports = {};
  const modules = {
    "server-only": {},
    "next/headers": { cookies: async () => ({ get: key => cookies.has(key) ? { value: cookies.get(key) } : undefined, set: (key, value, options) => { cookies.set(key, value); writes.push({ key, value, options }); } }) },
    "next/navigation": { redirect: path => { throw new Error(`REDIRECT:${path}`); } },
    "./db": { db: () => database },
    "./security.mjs": { digest, token: () => "b".repeat(64) },
  };
  const source = ts.transpileModule(await readFile("lib/admin-auth.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, require: name => { if (!(name in modules)) throw new Error(`Unexpected dependency ${name}`); return modules[name]; }, process: { env: { NODE_ENV: "production" } }, Date });
  return { auth: exports, cookies, rows, writes, lookups: () => lookups };
}

test("personal user cookie never authorizes administration or queries user sessions", async () => {
  const f = await authFixture();
  f.cookies.set("unsaidbox_session", "a".repeat(64));
  assert.equal(await f.auth.currentAdministrator(), null);
  assert.equal(f.lookups(), 0);
  await assert.rejects(f.auth.requireAdministrator(), /REDIRECT:\/admin\/login/);
  f.cookies.set("unsaidbox_admin_session", "a".repeat(64));
  assert.equal(await f.auth.currentAdministrator(), null);
});

test("admin session must exist, be unexpired and belong to an active administrator", async () => {
  const f = await authFixture();
  const token = "a".repeat(64);
  f.cookies.set("unsaidbox_admin_session", token);
  const record = { expiresAt: new Date(Date.now() + 60000), administrator: { id: "admin1", active: true } };
  f.rows.set(digest(token), record);
  assert.equal((await f.auth.requireAdministrator()).id, "admin1");
  record.administrator.active = false;
  assert.equal(await f.auth.currentAdministrator(), null);
  record.administrator.active = true;
  record.expiresAt = new Date(Date.now() - 1);
  assert.equal(await f.auth.currentAdministrator(), null);
});

test("admin session rotation and logout do not change personal cookies", async () => {
  const f = await authFixture();
  const user = "c".repeat(64), previous = "a".repeat(64);
  f.cookies.set("unsaidbox_session", user);
  f.cookies.set("unsaidbox_admin_session", previous);
  f.rows.set(digest(previous), {});
  await f.auth.beginAdministratorSession("admin1");
  assert.equal(f.rows.has(digest(previous)), false);
  const write = f.writes.at(-1);
  assert.equal(write.options.path, "/admin");
  assert.equal(write.options.httpOnly, true);
  assert.equal(write.options.secure, true);
  assert.equal(write.options.sameSite, "strict");
  assert.equal(f.rows.get(digest(write.value)).administratorId, "admin1");
  assert.ok(write.options.expires - Date.now() <= 8 * 3600000);
  await f.auth.endAdministratorSession();
  assert.equal(f.rows.size, 0);
  assert.equal(f.writes.at(-1).options.maxAge, 0);
  assert.equal(f.cookies.get("unsaidbox_session"), user);
});

test("admin routes and moderation use dedicated server guards, not user role checks", async () => {
  for (const path of ["app/admin/page.tsx", "app/admin/settings/page.tsx"]) {
    const source = await readFile(path, "utf8");
    assert.match(source, /await requireAdministrator\(\)/);
    assert.doesNotMatch(source, /requireAccount|DashboardShell/);
  }
  const actions = await readFile("app/actions.ts", "utf8");
  const moderation = actions.slice(actions.indexOf("export async function moderate("));
  assert.match(moderation, /await requireAdministrator\(\)/);
  assert.doesNotMatch(moderation, /requireAccount\(/);
  const auth = await readFile("app/admin/actions.ts", "utf8");
  assert.match(auth, /db\(\)\.administrator\.findUnique/);
  assert.doesNotMatch(auth, /db\(\)\.account\./);
  assert.match(auth, /admin-login:global/);
  assert.match(auth, /verifyCaptcha\(form, "adminLogin"\)/);
  assert.match(auth, /redirect\("\/admin"\)/);
  const shell = await readFile("components/AdminShell.tsx", "utf8");
  assert.doesNotMatch(shell, /href="\/dashboard|action=\{logout\}/);
  assert.match(shell, /action=\{adminLogout\}/);
});
