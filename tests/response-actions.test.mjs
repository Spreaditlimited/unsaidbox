import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as publishing from "../lib/publishing.mjs";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../components/ResponseActions.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const exports = {};
runInNewContext(compiled, {
  exports,
  require(name) {
    if (name === "next/link") return { default: (props) => React.createElement("a", props) };
    if (name === "@/lib/publishing.mjs") return publishing;
    return require(name);
  },
});
const render = (overrides = {}) => renderToStaticMarkup(React.createElement(exports.ResponseActions, {
  response: { id: "response-123", status: "APPROVED", sharingPolicy: "OWNER_MAY_SHARE", publicVisible: false, ...overrides },
}));

test("approved hidden responses link directly to the share studio and retain review", () => {
  const html = render();
  assert.match(html, /href="\/dashboard\/responses\/response-123\/share"/);
  assert.match(html, /Create share card/);
  assert.match(html, /href="\/dashboard\/responses\/response-123"/);
  assert.match(html, /Review response/);
});

test("private-only and unapproved responses cannot expose a share action", () => {
  for (const overrides of [
    { sharingPolicy: "PRIVATE_ONLY" },
    ...["PENDING", "SPAM", "ARCHIVED"].map((status) => ({ status })),
  ]) {
    const html = render(overrides);
    assert.doesNotMatch(html, /Create share card|\/share"/);
    assert.match(html, /Review response/);
  }
});

test("both inbox and question answers use the shared actions", async () => {
  for (const path of ["app/dashboard/page.tsx", "app/dashboard/questions/[id]/page.tsx"]) {
    const page = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(page, /<ResponseActions response=\{s\} \/>/);
  }
});

test("direct share studio access remains owner-scoped and consent-checked", async () => {
  const page = await readFile(new URL("../app/dashboard/responses/[id]/share/page.tsx", import.meta.url), "utf8");
  assert.match(page, /requireAccount\(/);
  assert.match(page, /where: \{ id, accountId: a.id \}/);
  assert.match(page, /!r \|\| !canShareResponse\(r\)/);
});
