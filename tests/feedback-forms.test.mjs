import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parseQuestions,
  readFeedbackForm,
  readAnswers,
  assertFormAccepting,
  canShareFormAnswer,
} from "../lib/form-policy.mjs";
import { analyticsPage } from "../lib/analytics-policy.mjs";
const q = (patch = {}) => ({
  id: "thoughts",
  label: "Your thoughts?",
  type: "TEXT",
  required: true,
  options: [],
  ...patch,
});
const form = (pairs) => {
  const f = new FormData();
  for (const [k, v] of pairs) f.append(k, v);
  return f;
};
test("question schemas enforce IDs, supported types and limits", () => {
  assert.deepEqual(parseQuestions([q()]), [q()]);
  for (const input of [
    "not JSON",
    [],
    [q(), q()],
    [q({ id: 123 })],
    [q({ id: "bad space" })],
    [q({ type: "HTML" })],
    [q({ required: "true" })],
    [q({ label: " " })],
    Array.from({ length: 13 }, (_, i) => q({ id: `q${i}` })),
  ])
    assert.throws(() => parseQuestions(input));
});
test("choice options are bounded, distinct and nonempty", () => {
  for (const options of [
    [],
    ["a"],
    ["a", "A"],
    ["a", " "],
    Array.from({ length: 9 }, (_, i) => String(i)),
  ])
    assert.throws(() => parseQuestions([q({ type: "CHOICE", options })]));
  assert.deepEqual(
    parseQuestions([q({ type: "CHOICE", options: [" Yes ", "No"] })])[0]
      .options,
    ["Yes", "No"],
  );
});
test("form metadata is normalized and sharing is opt-in", () => {
  const f = form([
    ["title", " My form "],
    ["description", ""],
    ["thankYou", "Thanks"],
    ["theme", "sage"],
    ["questions", JSON.stringify([q()])],
  ]);
  assert.equal(readFeedbackForm(f).title, "My form");
  assert.equal(readFeedbackForm(f).allowSharing, false);
  f.set("allowSharing", "on");
  assert.equal(readFeedbackForm(f).allowSharing, true);
  f.set("theme", "arbitrary-css");
  assert.throws(() => readFeedbackForm(f));
});
test("required, empty and oversized responses are rejected", () => {
  assert.throws(() => readAnswers([q()], new FormData()));
  assert.throws(() =>
    readAnswers([q()], form([["answer:thoughts", "x".repeat(3001)]])),
  );
  assert.throws(() => readAnswers([q({ required: false })], new FormData()));
});
test("answers persist snapshots, not arbitrary labels or unknown fields", () => {
  const f = form([
    ["answer:thoughts", "  Honest feedback  "],
    ["label", "Forged"],
  ]);
  assert.deepEqual(readAnswers([q()], f), [
    {
      questionId: "thoughts",
      label: "Your thoughts?",
      type: "TEXT",
      textValue: "Honest feedback",
      numberValue: null,
    },
  ]);
  f.append("answer:unknown", "value");
  assert.throws(() => readAnswers([q()], f));
});
test("duplicate answers cannot smuggle multiple choices", () => {
  assert.throws(() =>
    readAnswers(
      [q()],
      form([
        ["answer:thoughts", "first"],
        ["answer:thoughts", "second"],
      ]),
    ),
  );
});
test("ratings require integer 1–5 and choices must match offered options", () => {
  for (const value of ["0", "6", "3.5", "3abc", "NaN"])
    assert.throws(() =>
      readAnswers([q({ type: "RATING" })], form([["answer:thoughts", value]])),
    );
  assert.equal(
    readAnswers([q({ type: "RATING" })], form([["answer:thoughts", "5"]]))[0]
      .numberValue,
    5,
  );
  assert.throws(() =>
    readAnswers(
      [q({ type: "CHOICE", options: ["Yes", "No"] })],
      form([["answer:thoughts", "Other"]]),
    ),
  );
});
test("optional skipped questions are not stored as empty responses", () => {
  assert.equal(
    readAnswers(
      [q(), q({ id: "optional", required: false })],
      form([["answer:thoughts", "Hello"]]),
    ).length,
    1,
  );
});
test("every availability gate is enforced independently", () => {
  const open = {
    linkActive: true,
    acceptingResponses: true,
    blocked: false,
    account: { status: "ACTIVE" },
  };
  assert.doesNotThrow(() => assertFormAccepting(open));
  for (const value of [
    null,
    { ...open, linkActive: false },
    { ...open, acceptingResponses: false },
    { ...open, blocked: true },
    { ...open, account: { status: "SUSPENDED" } },
  ])
    assert.throws(() => assertFormAccepting(value));
});
test("sharing needs both sender consent and owner policy, never visibility", () => {
  const entry = {
    shareAllowed: true,
    form: { allowSharing: true, blocked: false, account: { status: "ACTIVE" } },
  };
  assert.equal(canShareFormAnswer(entry), true);
  assert.equal(canShareFormAnswer({ ...entry, shareAllowed: false }), false);
  assert.equal(
    canShareFormAnswer({
      ...entry,
      form: { ...entry.form, allowSharing: false },
    }),
    false,
  );
  assert.equal(
    canShareFormAnswer({ ...entry, form: { ...entry.form, blocked: true } }),
    false,
  );
  assert.equal(
    canShareFormAnswer({
      ...entry,
      form: { ...entry.form, account: { status: "SUSPENDED" } },
    }),
    false,
  );
});
test("respondent and private form routes never enter analytics", () => {
  for (const route of [
    "/f/secret",
    "/f/secret/image",
    "/dashboard/forms",
    "/dashboard/forms/secret",
    "/admin/forms",
  ])
    assert.equal(analyticsPage(route), null);
});
test("migration adds only isolated feedback tables", () => {
  const sql = readFileSync(
    new URL(
      "../prisma/migrations/20261007010000_feedback_forms/migration.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.equal((sql.match(/CREATE TABLE/g) || []).length, 3);
  assert.ok(!/DROP|TRUNCATE|ALTER TABLE `(?!Feedback)/.test(sql));
  assert.ok(sql.includes("`shareAllowed` BOOLEAN NOT NULL DEFAULT false"));
  assert.ok(sql.includes("`linkActive` BOOLEAN NOT NULL DEFAULT false"));
});
