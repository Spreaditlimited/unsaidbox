import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import * as policy from "../lib/form-policy.mjs";
import { InputError } from "../lib/security.mjs";
const questions = [
  {
    id: "q1",
    label: "What helped?",
    type: "TEXT",
    required: true,
    options: [],
  },
];
function form(overrides = {}) {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    title: "My form",
    description: "",
    thankYou: "Thank you",
    questions: JSON.stringify(questions),
    theme: "sage",
    allowSharing: "off",
    operation: "draft",
    revision: "1",
    privacy: "on",
    requestKey: "11111111-1111-4111-a111-111111111111",
    "answer:q1": "A thoughtful answer",
    ...overrides,
  }))
    f.set(k, v);
  return f;
}
async function fixture({
  authorized = true,
  captcha = true,
  owner = "owner1",
  locked = false,
  active = false,
  blocked = false,
  sharing = false,
} = {}) {
  const state = {
    accesses: 0,
    forms: {
      f1: {
        id: "f1",
        accountId: owner,
        account: { status: "ACTIVE" },
        title: "Original",
        description: "",
        thankYou: "Thank you",
        questions,
        theme: "sage",
        allowSharing: sharing,
        locked,
        linkActive: active,
        acceptingResponses: active,
        blocked,
        revision: 1,
        responseCount: 0,
      },
    },
    entries: {},
  };
  const matches = (row, where) =>
    row &&
    Object.entries(where).every(([k, v]) =>
      k === "account" ? row.account.status === v.status : row[k] === v,
    );
  function apply(row, data) {
    for (const [k, v] of Object.entries(data))
      row[k] =
        v && typeof v === "object" && "increment" in v
          ? row[k] + v.increment
          : v && typeof v === "object" && "decrement" in v
            ? row[k] - v.decrement
            : v;
  }
  const client = {
    feedbackForm: {
      findFirst: async ({ where }) =>
        Object.values(state.forms).find((r) => matches(r, where)) ?? null,
      findUnique: async ({ where }) => state.forms[where.id] ?? null,
      updateMany: async ({ where, data }) => {
        const row = Object.values(state.forms).find((r) => matches(r, where));
        if (!row) return { count: 0 };
        apply(row, data);
        return { count: 1 };
      },
      update: async ({ where, data }) => {
        apply(state.forms[where.id], data);
        return state.forms[where.id];
      },
      create: async ({ data }) => {
        const row = {
          id: "new1",
          locked: false,
          linkActive: false,
          acceptingResponses: false,
          ...data,
        };
        state.forms.new1 = row;
        return row;
      },
      deleteMany: async ({ where }) => {
        const row = Object.values(state.forms).find((r) => matches(r, where));
        if (!row) return { count: 0 };
        delete state.forms[row.id];
        return { count: 1 };
      },
    },
    feedbackEntry: {
      findUnique: async ({ where }) =>
        Object.values(state.entries).find(
          (e) =>
            e.formId === where.formId_requestKey.formId &&
            e.requestKey === where.formId_requestKey.requestKey,
        ) ?? null,
      create: async ({ data }) => {
        state.entries[Object.keys(state.entries).length] = { ...data };
      },
    },
  };
  client.$transaction = async (fn) => {
    const before = structuredClone(state);
    try {
      return await fn(client);
    } catch (e) {
      Object.assign(state, before);
      throw e;
    }
  };
  const modules = {
    "next/cache": { revalidatePath() {} },
    "next/navigation": {
      redirect(p) {
        throw Error(`redirect:${p}`);
      },
      unstable_rethrow(e) {
        if (e.message.startsWith("redirect:")) throw e;
      },
    },
    "@/lib/db": {
      db: () => {
        state.accesses++;
        return client;
      },
    },
    "@/lib/auth": {
      requireAccount: async () => {
        if (!authorized) throw Error("redirect:/login");
        return { id: "owner1" };
      },
      rateLimit: async () => {},
    },
    "@/lib/captcha.mjs": {
      verifyCaptcha: async () => {
        if (!captcha) throw new InputError("CAPTCHA rejected");
      },
    },
    "@/lib/security.mjs": { InputError },
    "@/lib/form-policy.mjs": policy,
    "@/lib/form-templates": {
      getFormTemplate: () => ({ templateId: "blank" }),
    },
    "@/lib/avatar-image.mjs": {
      prepareAvatar: async () => {
        throw Error("Unused");
      },
    },
  };
  const exports = {};
  const code = ts.transpileModule(
    await readFile("app/dashboard/forms/actions.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    File,
    Uint8Array,
    console,
    require: (name) => {
      if (!modules[name]) throw Error(`Unexpected module ${name}`);
      return modules[name];
    },
  });
  return {
    state,
    save: (f = form(), id = "f1") => exports.saveFeedbackForm(id, {}, f),
    change: (f) => exports.changeFeedbackForm("f1", {}, f),
    submit: (f = form()) => exports.submitFeedbackForm("f1", {}, f),
    remove: (f) => exports.deleteFeedbackForm("f1", {}, f),
  };
}
test("form mutations require account authentication and CAPTCHA before data access", async () => {
  const f = await fixture({ authorized: false });
  await assert.rejects(f.save(), /redirect:\/login/);
  assert.equal(f.state.accesses, 0);
  const c = await fixture({ captcha: false });
  assert.match((await c.save()).error, /CAPTCHA/);
  assert.equal(c.state.accesses, 0);
});
test("cross-account edits and deletes cannot touch another owner's form", async () => {
  const f = await fixture({ owner: "someone-else" });
  assert.match((await f.save()).error, /not found/);
  assert.match(
    (await f.change(form({ operation: "pause" }))).error,
    /not found/,
  );
  assert.ok((await f.remove(form({ confirm: "DELETE" }))).error);
  assert.equal(f.state.forms.f1.title, "Original");
});
test("drafts remain inactive and publication locks the schema without public listing", async () => {
  const draft = await fixture();
  await assert.rejects(draft.save(form(), null), /redirect:/);
  assert.equal(draft.state.forms.new1.linkActive, false);
  const live = await fixture();
  await assert.rejects(live.save(form({ operation: "publish" })), /redirect:/);
  assert.equal(live.state.forms.f1.locked, true);
  assert.equal(live.state.forms.f1.linkActive, true);
  assert.equal(live.state.forms.f1.acceptingResponses, true);
  assert.equal(live.state.forms.f1.publicVisible, undefined);
});
test("published questions and sharing promise are immutable but appearance can change", async () => {
  const f = await fixture({ locked: true, active: true });
  assert.match((await f.save(form({ allowSharing: "on" }))).error, /locked/);
  assert.match(
    (
      await f.save(
        form({
          questions: JSON.stringify([{ ...questions[0], label: "Changed" }]),
        }),
      )
    ).error,
    /locked/,
  );
  await assert.rejects(
    f.save(form({ title: "A warmer welcome" })),
    /redirect:/,
  );
  assert.equal(f.state.forms.f1.title, "A warmer welcome");
});
test("stale edits and administrative restrictions fail closed", async () => {
  const f = await fixture();
  assert.match((await f.save(form({ revision: "0" }))).error, /another tab/);
  const blocked = await fixture({ blocked: true });
  assert.match((await blocked.save()).error, /administration/);
  assert.ok((await blocked.change(form({ operation: "resume" }))).error);
});
test("anonymous submissions need an active form, consent and valid schema revision", async () => {
  const draft = await fixture();
  assert.ok((await draft.submit()).error);
  assert.equal(draft.state.forms.f1.responseCount, 0);
  const f = await fixture({ active: true, locked: true });
  assert.ok((await f.submit(form({ privacy: "off" }))).error);
  assert.ok((await f.submit(form({ revision: "0" }))).error);
  assert.equal(f.state.forms.f1.responseCount, 0);
  assert.ok((await f.submit()).success);
  assert.equal(f.state.forms.f1.responseCount, 1);
  assert.equal(f.state.entries[0].shareAllowed, false);
});
test("retry keys deduplicate entries and counts, and sharing requires both permissions", async () => {
  const f = await fixture({ active: true, locked: true, sharing: true });
  assert.ok((await f.submit(form({ shareAllowed: "on" }))).success);
  assert.ok((await f.submit(form({ shareAllowed: "on" }))).success);
  assert.equal(f.state.forms.f1.responseCount, 1);
  assert.equal(Object.keys(f.state.entries).length, 1);
  assert.equal(f.state.entries[0].shareAllowed, true);
  const privateForm = await fixture({ active: true, locked: true });
  await privateForm.submit(form({ shareAllowed: "on" }));
  assert.equal(privateForm.state.entries[0].shareAllowed, false);
});
test("pause preserves link, disabling removes access, deletion requires disabled link", async () => {
  const f = await fixture({ active: true, locked: true });
  assert.ok((await f.change(form({ operation: "pause" }))).success);
  assert.equal(f.state.forms.f1.linkActive, true);
  assert.equal(f.state.forms.f1.acceptingResponses, false);
  assert.ok((await f.remove(form({ confirm: "DELETE" }))).error);
  await f.change(form({ operation: "disable", revision: "2" }));
  await assert.rejects(
    f.remove(form({ confirm: "DELETE" })),
    /redirect:\/dashboard\/forms/,
  );
});
test("duplicate creates an editable inactive copy, not a copy of responses", async () => {
  const f = await fixture({ active: true, locked: true });
  await assert.rejects(
    f.change(form({ operation: "duplicate" })),
    /redirect:.*new1\/edit/,
  );
  assert.equal(f.state.forms.new1.locked, false);
  assert.equal(f.state.forms.new1.linkActive, false);
  assert.equal(f.state.forms.f1.locked, true);
});
