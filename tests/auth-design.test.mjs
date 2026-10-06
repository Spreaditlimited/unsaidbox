import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("auth pages share the Sure Imports-style layout without marketing navigation", async () => {
  for (const path of ["app/login/page.tsx", "app/start/page.tsx"]) {
    const source = await readFile(path, "utf8");
    assert.match(source, /<AuthShell/);
    assert.doesNotMatch(source, /SiteShell/);
    assert.match(source, /<ActionForm\s+action=\{(?:login|register)\}/);
  }
});

test("password visibility controls are labelled and never submit the form", async () => {
  const source = await readFile("components/AuthField.tsx", "utf8");
  assert.match(source, /type="button"/);
  assert.match(source, /Hide password/);
  assert.match(source, /Show password/);
  assert.match(source, /aria-pressed=\{visible\}/);
  assert.match(source, /data-sensitive=/);
  const form = await readFile("components/ActionForm.tsx", "utf8");
  assert.match(form, /field.dataset.sensitive === "true"/);
});
