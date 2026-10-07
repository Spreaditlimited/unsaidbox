import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import vm from "node:vm";
import sharp from "sharp";

async function moduleFrom(path, modules = {}) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, require: name => modules[name] || {} };
  vm.runInNewContext(code, context);
  return context.exports;
}
const social = await moduleFrom("lib/social-metadata.ts");

test("website and journal cards are distinct, valid 1200x630 PNGs under 1MB", async () => {
  assert.notEqual(social.websiteSocialImage.url, social.blogSocialImage.url);
  for (const image of [social.websiteSocialImage, social.blogSocialImage]) {
    const bytes = await readFile(new URL(`../public${new URL(image.url).pathname}`, import.meta.url));
    const info = await sharp(bytes).metadata();
    assert.equal(info.format, "png");
    assert.equal(info.width, 1200); assert.equal(info.height, 630);
    assert.ok(bytes.length < 1000000);
    assert.ok(image.alt.length > 10);
  }
});
test("default social metadata uses absolute branded images on both platforms", () => {
  const result = social.socialMetadata({ title: "UnsaidBox", description: "Description" });
  assert.equal(result.openGraph.images[0].url, social.websiteSocialImage.url);
  assert.equal(result.twitter.images[0].url, social.websiteSocialImage.url);
  assert.equal(result.twitter.card, "summary_large_image");
  assert.equal(result.openGraph.siteName, "UnsaidBox");
});

async function article(post) {
  const page = await moduleFrom("app/blog/[slug]/page.tsx", {
    "@/lib/blog": { getPublicBlog: async () => post, blogImageUrl: p => p.image ? `/blog/media/${p.id}?v=${p.image.version}` : null },
    "@/lib/blog-policy.mjs": { blogOrigin: social.siteOrigin },
    "@/lib/social-metadata": social,
  });
  return page.generateMetadata({ params: Promise.resolve({ slug: "guide" }) });
}
const post = { id: "public-post", slug: "guide", title: "Guide", seoTitle: "SEO title", excerpt: "Excerpt", seoDescription: "SEO description", imageAlt: "Featured cover", image: { version: "version1" }, publishAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-02"), authorName: "UnsaidBox" };
test("published article uses its featured image and updates automatically with its version", async () => {
  for (const version of ["version1", "replacement2"]) {
    const result = await article({ ...post, image: { version } });
    const expected = `https://unsaidbox.com/blog/media/public-post?v=${version}`;
    assert.equal(result.openGraph.images[0].url, expected);
    assert.equal(result.twitter.images[0].url, expected);
    assert.equal(result.openGraph.images[0].alt, "Featured cover");
    assert.equal(result.openGraph.images[0].width, 1600);
    assert.equal(result.openGraph.type, "article");
    assert.equal(result.twitter.title, "SEO title");
  }
});
test("article without a cover gets the journal fallback on both platforms", async () => {
  const result = await article({ ...post, image: null });
  assert.equal(result.openGraph.images[0].url, social.blogSocialImage.url);
  assert.equal(result.twitter.images[0].url, social.blogSocialImage.url);
  assert.equal(result.openGraph.images[0].width, 1200);
});
test("unavailable articles do not reveal article-specific social metadata", async () => {
  const result = await article(null);
  assert.equal(result.robots.index, false);
  assert.equal(result.openGraph, undefined);
  assert.equal(result.twitter, undefined);
});
