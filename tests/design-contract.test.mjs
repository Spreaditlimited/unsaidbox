import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? sourceFiles(join(directory, entry.name))
        : /\.[jt]sx$/.test(entry.name)
          ? [join(directory, entry.name)]
          : [],
    ),
  );
  return groups.flat();
}

test("application pickers never regress to visible native browser controls", async () => {
  const files = [
    ...(await sourceFiles("app")),
    ...(await sourceFiles("components")),
  ];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /<select\b/, `${file}: use the shared Picker`);
    assert.doesNotMatch(
      source,
      /<input\b(?![^>]*\bhidden\b)[^>]*type=["'](?:date|datetime-local|month|week|time|color|file)["']/s,
      `${file}: use an accessible themed picker`,
    );
  }
});

test("shared picker preserves accessible labels and controlled form values", async () => {
  const source = await readFile("components/ui/Picker.tsx", "utf8");
  assert.match(source, /aria-labelledby=/);
  assert.match(source, /type="hidden" name=\{name\} value=\{value\}/);
  assert.match(source, /Select\.Portal/);
  assert.match(source, /Select\.ItemIndicator/);
});

test("workspace navigation exposes current page and keeps mobile navigation", async () => {
  const source = await readFile("components/DashboardNav.tsx", "utf8");
  assert.match(source, /aria-current=/);
  assert.match(source, /aria-label="Dashboard"/);
  const styles = await readFile("app/workspace.css", "utf8");
  assert.match(styles, /overflow-x: auto/);
});

test("dashboard form actions keep space from helper text and following controls", async () => {
  const styles = await readFile("app/workspace.css", "utf8");
  assert.match(
    styles,
    /\.workspace \.app-form\s*\{\s*display: grid;\s*gap: 24px;/,
  );
  assert.match(
    styles,
    /\.workspace \.app-form > \.button\s*\{\s*justify-self: start;\s*margin: 0;/,
  );
  assert.match(styles, /\.workspace \.panel > \.app-form \+ p,/);
  assert.match(
    styles,
    /\.workspace \.panel > \.app-form \+ \.copy-link\s*\{\s*margin-top: 24px;/,
  );
});

test("password fields and modals always use the accessible shared controls", async () => {
  for (const file of [
    ...(await sourceFiles("app")),
    ...(await sourceFiles("components")),
  ]) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(
      source,
      /<input\b[^>]*type=["']password["']/s,
      `${file}: use AuthField for passwords`,
    );
    assert.doesNotMatch(
      source,
      /<dialog\b|\b(?:alert|confirm|prompt)\s*\(/,
      `${file}: use a themed modal`,
    );
  }
  const source = await readFile("components/ActionForm.tsx", "utf8");
  for (const part of [
    "Portal",
    "Overlay",
    "Content",
    "Title",
    "Description",
    "Cancel",
  ])
    assert.ok(source.includes(`AlertDialog.${part}`));
  assert.match(source, /if \(pending\) event.preventDefault\(\)/);
  assert.match(source, /className="modal-form" noValidate/);
});
