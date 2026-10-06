import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import { userFilters, adminPageLink, restoredAccountStatus } from "../lib/admin-filters.mjs";
import { InputError } from "../lib/security.mjs";

test("user filters validate query options and keep pagination links encoded", () => {
  const f = userFilters({ q: "  person@example.com  ", status: "ACTIVE", verified: "no", page: "2", sort: "oldest" });
  assert.equal(f.q, "person@example.com");
  assert.equal(f.where.emailVerifiedAt, null);
  assert.equal(f.where.status, "ACTIVE");
  assert.equal(f.page, 2);
  assert.equal(f.where.OR.length, 3);
  assert.equal(userFilters({ page: "-1", status: "unexpected", q: ["not", "text"] }).page, 1);
  assert.deepEqual(userFilters({ status: "unexpected" }).where, {});
  assert.equal(userFilters({ q: "x".repeat(500) }).q.length, 100);
  assert.equal(userFilters({ page: "Infinity" }).page, 1);
  const link = new URL(adminPageLink("/admin/users", { q: "a&status=SUSPENDED", status: "ACTIVE" }, 2), "https://example.com");
  assert.equal(link.searchParams.get("q"), "a&status=SUSPENDED");
  assert.equal(link.searchParams.get("status"), "ACTIVE");
});

async function actionFixture({ authorized = true, status = "ACTIVE", verified = true } = {}) {
  const state = { status, sessions: 2, audits: [], queued: [], queryCount: 0 };
  const tx = {
    account: {
      findUnique: async () => { state.queryCount++; return { id: "user1", username: "person", status: state.status, emailVerifiedAt: verified ? new Date() : null }; },
      updateMany: async ({ where, data }) => { assert.equal(where.id, "user1"); if (where.status !== state.status) return { count: 0 }; state.status = data.status; return { count: 1 }; },
    },
    session: { deleteMany: async ({ where }) => { assert.equal(where.accountId, "user1"); state.sessions = 0; } },
    auditEvent: { create: async ({ data }) => state.audits.push(data) },
  };
  const modules = {
    "next/cache": { revalidatePath: () => {} },
    "next/navigation": { unstable_rethrow: error => { if (error.message === "redirect") throw error; } },
    "@/lib/admin-auth": { requireAdministrator: async () => { if (!authorized) throw Error("redirect"); return { id: "admin1" }; } },
    "@/lib/auth": { rateLimit: async () => {} },
    "@/lib/db": { db: () => ({ $transaction: async fn => { const before = structuredClone(state); try { return await fn(tx); } catch (error) { Object.assign(state, before); throw error; } } }) },
    "@/lib/captcha.mjs": { verifyCaptcha: async (_, action) => assert.equal(action, "manageUser") },
    "@/lib/security.mjs": { InputError, token: () => "fixture" },
    "@/lib/admin-filters.mjs": { restoredAccountStatus },
    "@/lib/email-config.mjs": { emailConfigured: () => true },
    "@/lib/email-queue.mjs": { queueEmail: async (_, args) => state.queued.push(args) },
    "@/lib/email": { scheduleEmails: () => {} },
  };
  const exports = {};
  const source = ts.transpileModule(await readFile("app/admin/user-actions.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, require: name => { if (!(name in modules)) throw Error(`Unexpected dependency ${name}`); return modules[name]; } });
  const form = new FormData(); form.set("confirmation", "@person");
  return { state, form, run: (operation, submitted = form) => exports.manageUser("user1", operation, {}, submitted) };
}

test("account controls reject unauthenticated calls before looking up users", async () => {
  const f = await actionFixture({ authorized: false });
  await assert.rejects(f.run("suspend"), /redirect/);
  assert.equal(f.state.queryCount, 0);
});
test("account controls require an exact confirmation and reject unexpected operations", async () => {
  const f = await actionFixture();
  const form = new FormData(); form.set("confirmation", "@someoneelse");
  assert.ok((await f.run("suspend", form)).error);
  assert.ok((await f.run("delete")).error);
  assert.equal(f.state.status, "ACTIVE"); assert.equal(f.state.sessions, 2); assert.equal(f.state.audits.length, 0);
});
test("suspending a user revokes only their sessions and records the administrator", async () => {
  const f = await actionFixture();
  assert.ok((await f.run("suspend")).success);
  assert.equal(f.state.status, "SUSPENDED"); assert.equal(f.state.sessions, 0);
  assert.equal(f.state.audits[0].actorId, "admin1"); assert.equal(f.state.audits[0].targetId, "user1");
  assert.equal(f.state.queued[0].kind, "SUSPENDED");
});
test("restoration does not bypass email verification or accept stale states", async () => {
  const f = await actionFixture({ status: "SUSPENDED", verified: false });
  assert.ok((await f.run("restore")).success);
  assert.equal(f.state.status, "PENDING"); assert.equal(f.state.queued.length, 0);
  assert.ok((await f.run("restore")).error);
  const verified = await actionFixture({ status: "SUSPENDED", verified: true });
  assert.ok((await verified.run("restore")).success); assert.equal(verified.state.status, "ACTIVE");
});
test("session revocation leaves account status and passwords untouched", async () => {
  const f = await actionFixture();
  assert.ok((await f.run("revoke")).success);
  assert.equal(f.state.sessions, 0); assert.equal(f.state.status, "ACTIVE"); assert.equal(f.state.queued.length, 0);
});
test("every console page checks admin identity and detail queries exclude secrets", async () => {
  for (const path of ["app/admin/page.tsx", "app/admin/users/page.tsx", "app/admin/users/[id]/page.tsx", "app/admin/activity/page.tsx", "app/admin/moderation/page.tsx"]) {
    const source = await readFile(path, "utf8");
    assert.match(source, /await requireAdministrator\(\)/);
    assert.doesNotMatch(source, /passwordHash:\s*true|payload:\s*true|tokenHash:\s*true/);
  }
  const detail = await readFile("app/admin/users/[id]/page.tsx", "utf8");
  assert.doesNotMatch(detail, /submission\.find|body:\s*true|ownerReply:\s*true/);
  const controls = await readFile("components/AdminAccountActions.tsx", "utf8");
  assert.match(controls, /AlertDialog.Content/);
  assert.doesNotMatch(controls, /window\.(confirm|alert|prompt)/);
});
