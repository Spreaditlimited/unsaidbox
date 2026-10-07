import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import * as policy from "../lib/blog-policy.mjs";
import { InputError } from "../lib/security.mjs";
import { analyticsPage } from "../lib/analytics-policy.mjs";

function form(overrides = {}) {
  const f = new FormData();
  for (const [key, value] of Object.entries({ title: "Ask better questions", slug: "ask-better-questions", excerpt: "An actionable guide to asking your audience thoughtful questions.", contentHtml: `<h2>Listen first</h2><p>${"A useful editorial paragraph. ".repeat(12)}</p>`, authorName: "UnsaidBox Editorial", category: policy.blogCategories[0], seoTitle: "", seoDescription: "", imageAlt: "", revision: "1", operation: "draft", ...overrides })) f.set(key, value);
  return f;
}
test("robots allows public crawling and excludes account and audience content", async () => {
  const source = await readFile(new URL("../app/robots.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {} };
  vm.runInNewContext(code, context);
  const result = context.exports.default();
  assert.equal(result.sitemap, "https://unsaidbox.com/sitemap.xml");
  assert.equal(result.rules[0].userAgent, "*");
  assert.equal(result.rules[0].allow, "/");
  assert.equal(result.host, "https://unsaidbox.com");
  for (const path of ["/admin", "/dashboard", "/api/", "/u/", "/q/", "/f/", "/explore", "/login", "/reset-password"])
    assert.ok(result.rules[0].disallow.includes(path));
  for (const path of ["/", "/blog", "/social/", "/sitemap.xml", "/_next/"])
    assert.ok(!result.rules[0].disallow.includes(path));
});
test("blog HTML preserves editorial structure but strips executable and tracking content", () => {
  const clean = policy.cleanBlogHtml('<h2>Guide</h2><p onclick="bad()">Hello <strong>reader</strong><script>alert(1)</script><iframe src="https://bad.test"></iframe><img src="https://tracker.test"><a href="javascript:bad()">unsafe</a><a href="https://example.com">safe</a></p>');
  assert.match(clean, /<h2>Guide<\/h2>/);
  assert.match(clean, /<strong>reader<\/strong>/);
  assert.doesNotMatch(clean, /onclick|javascript|script|iframe|tracker/);
  assert.match(clean, /href="https:\/\/example.com"/);
});
test("all public publication boundaries include timestamp and publication permission", () => {
  const now = new Date("2026-10-10T09:00:00Z");
  assert.deepEqual(policy.publicBlogWhere(now), { published: true, publishAt: { lte: now } });
  assert.equal(policy.blogStatus({ published: true, publishAt: now }, now), "PUBLISHED");
  assert.equal(policy.blogStatus({ published: true, publishAt: new Date(now.getTime() + 1) }, now), "SCHEDULED");
  assert.equal(policy.blogStatus({ published: false, publishAt: now }, now), "DRAFT");
  assert.equal(policy.blogStatus({ published: true, publishAt: null }, now), "DRAFT");
});
test("scheduling validates calendar dates, time and UTC without silently normalizing", () => {
  assert.equal(policy.publicationDate("2026-10-26", "09:00").toISOString(), "2026-10-26T09:00:00.000Z");
  for (const [date, time] of [["2026-02-30", "09:00"], ["2026-10-01", "24:00"], ["2026-10-01", "10:60"], ["tomorrow", "09:00"], ["2026-10-01", "9:00"]]) assert.throws(() => policy.publicationDate(date, time), InputError);
});
test("draft validation, reserved slugs and publish readiness are enforced", () => {
  const draft = policy.readBlogForm(form());
  policy.validatePublication(draft);
  for (const slug of ["feed", "rss", "../admin", "HELLO", "two words", "<script>"]) assert.throws(() => policy.readBlogForm(form({ slug })), InputError);
  assert.throws(() => policy.readBlogForm(form({ title: "x".repeat(181) })), InputError);
  assert.throws(() => policy.validatePublication({ ...draft, contentHtml: "<p></p>" }), InputError);
});
test("status filtering distinguishes future and live posts and bounds paging", () => {
  const now = new Date();
  assert.deepEqual(policy.blogListQuery({ status: "PUBLISHED" }, now).where, policy.publicBlogWhere(now));
  assert.deepEqual(policy.blogListQuery({ status: "SCHEDULED" }, now).where, { published: true, publishAt: { gt: now } });
  assert.equal(policy.blogListQuery({ page: "-8" }).page, 1);
  assert.equal(policy.blogListQuery({ page: "999999" }).page, 10000);
});
test("blog analytics allow editorial pages, never private paths or images", () => {
  assert.equal(analyticsPage("/blog"), "Blog");
  assert.equal(analyticsPage("/blog/ask-better-questions"), "Blog article");
  for (const path of ["/blog/media", "/blog/media/post1", "/blog/feed", "/admin/blog/post1/preview", "/u/someone/ask"]) assert.equal(analyticsPage(path), null);
});

async function fixture({ authorized = true, published = false, revision = 1, collision = false, captcha = true } = {}) {
  const state = { posts: { post1: { id: "post1", slug: "original", published, publishAt: published ? new Date("2026-01-01") : null, revision } }, aliases: { original: { postId: "post1" }, ...(collision ? { "ask-better-questions": { postId: "someone-else" } } : {}) }, audits: [], accesses: 0 };
  const tx = {
    blogPost: {
      findUnique: async ({ where }) => state.posts[where.id],
      create: async ({ data }) => { state.posts.new1 = { id: "new1", ...data }; return state.posts.new1; },
      updateMany: async ({ where, data }) => { const p = state.posts[where.id]; if (!p || p.revision !== where.revision) return { count: 0 }; Object.assign(p, data, { revision: p.revision + 1 }); return { count: 1 }; },
      deleteMany: async ({ where }) => { const p = state.posts[where.id]; if (!p || p.published !== where.published) return { count: 0 }; delete state.posts[where.id]; return { count: 1 }; },
    },
    blogSlug: { findUnique: async ({ where }) => state.aliases[where.slug], create: async ({ data }) => { state.aliases[data.slug] = data; } },
    auditEvent: { create: async ({ data }) => state.audits.push(data) },
  };
  const modules = {
    "next/cache": { revalidatePath() {} },
    "next/navigation": { redirect(path) { throw Error(`redirect:${path}`); }, unstable_rethrow(e) { if (e.message.startsWith("redirect:")) throw e; } },
    "@/lib/admin-auth": { requireAdministrator: async () => { if (!authorized) throw Error("redirect:/admin/login"); return { id: "admin1" }; } },
    "@/lib/auth": { rateLimit: async () => {} },
    "@/lib/db": { db: () => { state.accesses++; return { $transaction: async fn => { const before = structuredClone(state); try { return await fn(tx); } catch (e) { Object.assign(state, before); throw e; } } }; } },
    "@/lib/captcha.mjs": { verifyCaptcha: async () => { if (!captcha) throw new InputError("CAPTCHA rejected"); } },
    "@/lib/security.mjs": { InputError },
    "@/lib/blog-policy.mjs": policy,
  };
  const exports = {};
  const code = ts.transpileModule(await readFile("app/admin/blog/actions.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => { if (!modules[name]) throw Error(`Unexpected ${name}`); return modules[name]; } });
  return { state, save: (f = form(), id = "post1") => exports.saveBlog(id, {}, f), remove: f => exports.deleteBlog("post1", {}, f) };
}
test("blog mutations deny personal/unauthenticated sessions and rejected CAPTCHA before database access", async () => {
  const f = await fixture({ authorized: false });
  await assert.rejects(f.save(), /redirect:\/admin\/login/);
  await assert.rejects(f.remove(form()), /redirect:\/admin\/login/);
  assert.equal(f.state.accesses, 0);
  const c = await fixture({ captcha: false });
  assert.match((await c.save()).error, /CAPTCHA/);
  assert.equal(c.state.accesses, 0);
});
test("saving a draft keeps it private and preserves old-slug redirect mappings", async () => {
  const f = await fixture();
  await assert.rejects(f.save(), /redirect:\/admin\/blog\/post1/);
  assert.equal(f.state.posts.post1.published, false);
  assert.equal(f.state.aliases.original.postId, "post1");
  assert.equal(f.state.aliases["ask-better-questions"].postId, "post1");
  assert.equal(f.state.audits[0].actorId, "admin1");
});
test("publishing preserves first public date, scheduling is future-only, unpublishing clears public state", async () => {
  const live = await fixture({ published: true });
  await assert.rejects(live.save(form({ operation: "publish" })), /redirect:/);
  assert.equal(live.state.posts.post1.publishAt.toISOString(), "2026-01-01T00:00:00.000Z");
  const future = await fixture();
  await assert.rejects(future.save(form({ operation: "schedule", publishDate: "2099-10-10", publishTime: "09:00" })), /redirect:/);
  assert.equal(policy.blogStatus(future.state.posts.post1), "SCHEDULED");
  const past = await fixture();
  assert.match((await past.save(form({ operation: "schedule", publishDate: "2000-01-01", publishTime: "09:00" }))).error, /future/);
  const hidden = await fixture({ published: true });
  await assert.rejects(hidden.save(form({ operation: "draft" })), /redirect:/);
  assert.equal(hidden.state.posts.post1.published, false);
  assert.equal(hidden.state.posts.post1.publishAt, null);
});
test("stale edits and slug collisions cannot overwrite another change", async () => {
  const stale = await fixture({ revision: 2 });
  assert.match((await stale.save()).error, /another tab/);
  assert.equal(stale.state.posts.post1.slug, "original");
  const collision = await fixture({ collision: true });
  assert.match((await collision.save()).error, /reserved/);
  assert.equal(collision.state.audits.length, 0);
});
test("deletion requires explicit confirmation and a draft", async () => {
  const published = await fixture({ published: true });
  assert.match((await published.remove(form({ confirm: "DELETE" }))).error, /Unpublish/);
  const draft = await fixture();
  assert.match((await draft.remove(form())).error, /DELETE/);
  await assert.rejects(draft.remove(form({ confirm: "DELETE" })), /redirect:\/admin\/blog$/);
  assert.equal(draft.state.posts.post1, undefined);
});
test("public article, media, sitemap and feed all enforce scheduled visibility", async () => {
  for (const file of ["lib/blog.ts", "app/blog/page.tsx", "app/blog/media/[id]/route.ts", "app/blog/feed/route.ts", "app/sitemap.ts"]) {
    assert.match(await readFile(file, "utf8"), /publicBlogWhere\(/, file);
  }
  for (const file of ["app/admin/blog/page.tsx", "app/admin/blog/new/page.tsx", "app/admin/blog/[id]/page.tsx", "app/admin/blog/[id]/preview/page.tsx"]) assert.match(await readFile(file, "utf8"), /await requireAdministrator\(\)/, file);
  const image = await readFile("lib/blog-image.ts", "utf8");
  assert.doesNotMatch(image, /published:\s*true|rejectUnauthorized:\s*false|cloudinary|tochukwunkwocha/i);
  assert.match(image, /imageLock: lock/);
  const route = await readFile("app/admin/blog/[id]/image/route.ts", "utf8");
  assert.match(route, /currentAdministrator\(/);
  assert.match(route, /verifyCaptcha\(form, "blogImage"\)/);
});
