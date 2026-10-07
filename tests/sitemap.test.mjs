import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import vm from "node:vm";
import { publicBlogWhere, blogOrigin } from "../lib/blog-policy.mjs";

async function sitemap(fail = false) {
  let query;
  const source = await readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8");
  const modules = {
    "@/lib/db": { db: () => ({ blogPost: { findMany: async options => {
      query = options;
      if (fail) throw new Error("private database details");
      return [{ slug: "published-guide", updatedAt: new Date("2026-01-01") }];
    } } }) },
    "@/lib/blog-policy.mjs": { publicBlogWhere, blogOrigin },
  };
  const logs = [];
  const context = { exports: {}, require: name => modules[name], console: { error: message => logs.push(message) } };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  return { entries: await context.exports.default(), query, logs };
}
test("sitemap includes public information pages and only publication-filtered blog posts", async () => {
  const { entries, query } = await sitemap();
  assert.deepEqual(Array.from(entries, e => e.url), ["", "/blog", "/templates", "/contact", "/safety", "/cookies", "/blog/published-guide"].map(path => blogOrigin + path));
  assert.equal(query.where.published, true);
  assert.ok(query.where.publishAt.lte instanceof Date);
});
test("database failure leaves a usable static sitemap without exposing connection details", async () => {
  const { entries, logs } = await sitemap(true);
  assert.equal(entries.length, 6);
  assert.equal(entries[0].url, blogOrigin);
  assert.equal(logs.length, 1);
  assert.doesNotMatch(logs[0], /private database details/);
});
test("static sitemap pages opt into indexing while all other routes remain noindex by default", async () => {
  for (const path of ["app/page.tsx", "app/templates/page.tsx", "app/contact/page.tsx", "app/safety/page.tsx", "app/cookies/page.tsx"])
    assert.match(await readFile(new URL(`../${path}`, import.meta.url), "utf8"), /robots: \{ index: true, follow: true \}/);
  assert.match(await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"), /robots: \{ index: false, follow: false \}/);
});
