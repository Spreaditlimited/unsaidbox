import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import { defaultPricing, parseMoney, parsePricing, pricingRevision, validateStoredPricing } from "../lib/billing-policy.mjs";
import { InputError } from "../lib/security.mjs";

const input = (overrides = {}) => {
  const form = new FormData();
  for (const [key, value] of Object.entries({ revision: "1", gbpMonthly: "9.00", gbpAnnual: "90.00", usdMonthly: "12.00", usdAnnual: "120.00", ...overrides })) form.set(key, value);
  return form;
};

test("approved GBP and USD prices are integer minor units", () => {
  assert.deepEqual(defaultPricing(), { gbpMonthly: 900, gbpAnnual: 9000, usdMonthly: 1200, usdAnnual: 12000 });
  assert.deepEqual(parsePricing(input()), defaultPricing());
  assert.equal(parseMoney("1.01"), 101);
  assert.equal(parseMoney("9.9"), 990);
  assert.equal(parseMoney(" 12.00 "), 1200);
  const prices = defaultPricing(); prices.gbpMonthly = 1;
  assert.equal(defaultPricing().gbpMonthly, 900);
});

test("prices reject coercion, rounding, negative, zero and unreasonable amounts", () => {
  for (const value of [null, undefined, "", " ", "0", "0.49", "-9", "+9", "NaN", "Infinity", "1e2", "0x10", "9.001", "£9", "9,00", "1,000", "10000.01", "100000", "09", 900]) {
    assert.throws(() => parseMoney(value), InputError, String(value));
  }
  assert.equal(parseMoney("0.50"), 50);
  assert.equal(parseMoney("10000.00"), 1000000);
});

test("all prices and revisions must validate; corrupted configuration fails closed", () => {
  const form = input(); form.delete("usdAnnual");
  assert.throws(() => parsePricing(form), InputError);
  for (const value of ["0", "-1", "1.0", "1e2", "", null, "1000000000"]) assert.throws(() => pricingRevision(value), InputError);
  assert.equal(pricingRevision("2"), 2);
  assert.deepEqual(validateStoredPricing(defaultPricing()), defaultPricing());
  for (const value of [null, [], {}, { ...defaultPricing(), gbpMonthly: "900" }, { ...defaultPricing(), usdAnnual: -1 }]) assert.throws(() => validateStoredPricing(value), InputError);
});

async function fixture({ authenticated = true, captcha = true, revision = 1, auditFails = false } = {}) {
  const state = { revision, prices: defaultPricing(), audits: [], accesses: 0 };
  const modules = {
    "next/navigation": { unstable_rethrow(e) { if (e.message.startsWith("redirect:")) throw e; } },
    "next/cache": { revalidatePath() {} },
    "@/lib/admin-auth": { requireAdministrator: async () => { if (!authenticated) throw Error("redirect:/admin/login"); return { id: "admin1" }; } },
    "@/lib/captcha.mjs": { verifyCaptcha: async (_, action) => { assert.equal(action, "saveBillingPricing"); if (!captcha) throw new InputError("CAPTCHA rejected"); } },
    "@/lib/auth": { rateLimit: async () => {} },
    "@/lib/security.mjs": { InputError },
    "@/lib/billing-policy.mjs": { parsePricing, pricingRevision },
    "@/lib/db": { db: () => { state.accesses++; return { $transaction: async fn => {
      const before = structuredClone(state);
      try { return await fn({
        billingConfiguration: { updateMany: async ({ where, data }) => {
          assert.equal(where.id, "pricing"); assert.equal(data.updatedBy, "admin1");
          if (where.revision !== state.revision) return { count: 0 };
          state.prices = data.prices; state.revision++; return { count: 1 };
        } },
        auditEvent: { create: async ({ data }) => { if (auditFails) throw Error("unavailable"); state.audits.push(data); } },
      }); } catch (e) { Object.assign(state, before); throw e; }
    } }; } },
  };
  const exports = {};
  const code = ts.transpileModule(await readFile("app/admin/billing/actions.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require(name) { if (!modules[name]) throw Error(`Unexpected import ${name}`); return modules[name]; } });
  return { state, save: (form = input()) => exports.saveBillingPricing({}, form) };
}

test("pricing changes require administrator authentication and CAPTCHA before accessing data", async () => {
  const denied = await fixture({ authenticated: false });
  await assert.rejects(denied.save(), /redirect:/); assert.equal(denied.state.accesses, 0);
  const captcha = await fixture({ captcha: false });
  assert.match((await captcha.save()).error, /CAPTCHA/); assert.equal(captcha.state.accesses, 0);
});

test("pricing changes validate server-side and cannot overwrite stale revisions", async () => {
  const invalid = await fixture();
  assert.ok((await invalid.save(input({ gbpMonthly: "0" }))).error); assert.equal(invalid.state.accesses, 0);
  const stale = await fixture({ revision: 2 });
  assert.match((await stale.save()).error, /another tab/); assert.deepEqual(stale.state.prices, defaultPricing());
  assert.equal(stale.state.audits.length, 0);
});

test("price update and administrator audit commit atomically without Stripe calls", async () => {
  const valid = await fixture();
  assert.ok((await valid.save(input({ gbpMonthly: "10.50", accountId: "other" }))).success);
  assert.equal(valid.state.prices.gbpMonthly, 1050); assert.equal(valid.state.revision, 2);
  assert.equal(valid.state.audits[0].actorId, "admin1");
  assert.equal(valid.state.audits[0].action, "billing:pricing_revision_2");
  const rollback = await fixture({ auditFails: true });
  assert.ok((await rollback.save(input({ gbpMonthly: "10.50" }))).error);
  assert.equal(rollback.state.prices.gbpMonthly, 900); assert.equal(rollback.state.revision, 1);
});
