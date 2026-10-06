import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import vm from "node:vm";
import ts from "typescript";
import sharp from "sharp";
import { InputError } from "../lib/security.mjs";
import { blogImagePrompt } from "../lib/blog-policy.mjs";

async function fixture({ fails = false, busy = false } = {}) {
  const state = { image: "original", lock: null, audits: [], requests: 0 };
  const database = {
    blogPost: {
      updateMany: async ({ where, data }) => {
        if (where.OR && busy) return { count: 0 };
        if (where.imageLock && where.imageLock !== state.lock) return { count: 0 };
        state.lock = data.imageLock;
        return { count: 1 };
      },
      findUniqueOrThrow: async () => ({ title: "A thoughtful question", category: "Creator guides", contentHtml: "<p>Article context</p>" }),
    },
    blogImage: { upsert: async ({ update }) => { state.image = update.image; } },
    auditEvent: { create: async ({ data }) => state.audits.push(data) },
  };
  database.$transaction = async fn => fn(database);
  const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#faf9f6" } }).png().toBuffer();
  const modules = {
    "server-only": {}, "sharp": { default: sharp }, "node:crypto": { randomBytes },
    "./db": { db: () => database }, "./security.mjs": { InputError }, "./blog-policy.mjs": { blogImagePrompt },
  };
  const exports = {};
  const source = ts.transpileModule(await readFile("lib/blog-image.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, require: name => modules[name], Buffer, AbortSignal, process: { env: { UNSAIDBOX_OPENAI_API_KEY: "fixture-not-a-real-key", UNSAIDBOX_OPENAI_IMAGE_MODEL: "fixture-image-model" } }, fetch: async () => { state.requests++; return { ok: !fails, status: fails ? 503 : 200, json: async () => ({ data: [{ b64_json: png.toString("base64") }] }) }; } });
  return { state, png, ...exports };
}
test("blog image processing creates a bounded, metadata-free 16:9 WebP", async () => {
  const f = await fixture();
  const result = await f.prepareBlogImage(f.png);
  const meta = await sharp(result).metadata();
  assert.equal(meta.width, 1600); assert.equal(meta.height, 900); assert.equal(meta.format, "webp");
  assert.equal(meta.exif, undefined); assert.ok(result.length < 700000);
  await assert.rejects(f.prepareBlogImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')), /static JPG/);
});
test("successful image generation saves output and clears the lock", async () => {
  const f = await fixture();
  const version = await f.updateBlogImage("post1", "admin1");
  assert.match(version, /^[a-f0-9]{32}$/);
  assert.ok(Buffer.isBuffer(f.state.image));
  assert.equal(f.state.requests, 1); assert.equal(f.state.lock, null);
  assert.equal(f.state.audits[0].action, "blog:image-generate");
});
test("failed image generation retains existing cover and releases the lock", async () => {
  const f = await fixture({ fails: true });
  await assert.rejects(f.updateBlogImage("post1", "admin1"), /provider status 503/);
  assert.equal(f.state.image, "original"); assert.equal(f.state.lock, null); assert.equal(f.state.audits.length, 0);
});
test("concurrent generation does not make a paid provider call", async () => {
  const f = await fixture({ busy: true });
  await assert.rejects(f.updateBlogImage("post1", "admin1"), /already being processed/);
  assert.equal(f.state.requests, 0); assert.equal(f.state.image, "original");
});
test("manual uploads never call the image provider", async () => {
  const f = await fixture();
  await f.updateBlogImage("post1", "admin1", f.png);
  assert.equal(f.state.requests, 0); assert.equal(f.state.audits[0].action, "blog:image-upload");
});
