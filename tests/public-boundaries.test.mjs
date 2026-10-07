import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");
test("Explore displays usernames and does not fetch owners' full names", async () => {
  const page = await source("app/explore/page.tsx");
  assert.match(page, /account: \{ select: \{ username: true \} \}/);
  assert.match(page, /@\{q\.account\.username\}/);
  assert.doesNotMatch(page, /displayName/);
  for (const gate of ["linkActive: true", "publicVisible: true", "discoverable: true", "discoveryApproved: true", 'status: "ACTIVE"', "publicPageEnabled: true"])
    assert.ok(page.includes(gate));
});
test("thread owner labels use usernames without fetching full names", async () => {
  const page = await source("app/q/[id]/page.tsx");
  assert.match(page, /username: true/);
  assert.match(page, /@\{q\.account\.username\}’s box/);
  assert.match(page, /@\{q\.account\.username\} replied/);
  assert.doesNotMatch(page, /displayName/);
});
test("public response projection omits unredacted originals before rendering", async () => {
  const sql = await source("lib/public-data.ts");
  assert.match(sql, /COALESCE\(s\.publicBody, s\.body\) AS text/);
  for (const rule of [
    "s.status = 'APPROVED'",
    "s.publicVisible = true",
    "s.sharingPolicy = 'OWNER_MAY_SHARE'",
    "a.publicPageEnabled = true",
    "q.publicVisible = true",
  ])
    assert.ok(sql.includes(rule));
  for (const path of ["app/q/[id]/page.tsx", "app/u/[username]/page.tsx"]) {
    const page = await source(path);
    assert.match(page, /publicResponses/);
    assert.doesNotMatch(page, /publicBody\s*\?\?\s*r\.body|account:\s*true/);
  }
});
test("session-backed page identity never queries password hashes", async () => {
  const auth = await source("lib/auth.ts");
  assert.doesNotMatch(auth, /passwordHash|account:\s*true/);
  assert.match(auth, /httpOnly: true/);
  assert.match(auth, /sameSite: "lax"/);
});
test("private data modules cannot be bundled into client components", async () => {
  for (const path of ["lib/db.ts", "lib/auth.ts", "lib/public-data.ts"])
    assert.match(await source(path), /import ["']server-only["']/);
});
