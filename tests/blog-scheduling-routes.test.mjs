import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import * as policy from '../lib/blog-policy.mjs';

test('real public handlers and metadata switch together at publication without redeployment', async () => {
  const require = createRequire(import.meta.url);
  const at = new Date('2026-10-08T08:00:00Z');
  let now = new Date(at.getTime() - 1), published = true, coverReads = 0;
  const post = { id: 'scheduled', slug: 'scheduled-article', title: 'Scheduled article', excerpt: 'Useful guidance', category: 'Creator guides', contentHtml: '<p>Article</p>', authorName: 'Editorial', imageAlt: 'Cover', publishAt: at, updatedAt: at, image: { version: 'v1' } };
  const eligible = where => published && where.published === true && where.publishAt.lte >= at;
  const database = {
    blogSlug: { findUnique: async () => ({ postId: post.id }) },
    blogPost: { findFirst: async ({ where }) => eligible(where) ? post : null, findMany: async ({ where }) => eligible(where) ? [post] : [], count: async ({ where }) => eligible(where) ? 1 : 0 },
    blogImage: { findFirst: async ({ where }) => eligible(where.post) ? { image: Buffer.from('cover') } : null },
  };
  const modules = {
    'server-only': {}, react: { cache: fn => fn }, 'react/jsx-runtime': require('react/jsx-runtime'), 'next/link': { default: 'a' },
    'next/navigation': { notFound: () => { throw Error('404'); }, permanentRedirect: () => { throw Error('redirect'); } },
    '@/components/SiteShell': { SiteShell: 'main' }, '@/components/blog/BlogArticle': { BlogArticle: 'article' },
    '@/lib/db': { db: () => database }, './db': { db: () => database },
    '@/lib/blog-policy.mjs': { ...policy, publicBlogWhere: () => policy.publicBlogWhere(now) },
    './blog-policy.mjs': { ...policy, publicBlogWhere: () => policy.publicBlogWhere(now) },
    '@/lib/blog-cloudinary.mjs': { readBlogCover: async () => { coverReads++; return Buffer.from('cover'); } },
    '@/lib/social-metadata': { articleSocialImage: x => x, socialMetadata: () => ({}), blogSocialImage: {} },
  };
  async function load(file) {
    const exports = {};
    vm.runInNewContext(ts.transpileModule(await readFile(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: n => { if (!(n in modules)) throw Error(n); return modules[n]; }, Response, Uint8Array, URLSearchParams, console });
    return exports;
  }
  modules['@/lib/blog'] = await load('lib/blog.ts');
  const article = await load('app/blog/[slug]/page.tsx');
  const listing = await load('app/blog/page.tsx');
  const media = await load('app/blog/media/[id]/route.ts');
  const feed = await load('app/blog/feed/route.ts');
  const sitemap = await load('app/sitemap.ts');
  const props = { params: Promise.resolve({ slug: post.slug }) };
  for (const visible of [false, true, false]) {
    if (visible) now = at;
    else if (now === at) published = false; // unpublishing also removes all public surfaces
    const tree = JSON.stringify(await listing.default({ searchParams: Promise.resolve({}) }));
    assert.equal(tree.includes(post.slug), visible);
    assert.equal((await feed.GET()).headers.get('Cache-Control'), 'no-store');
    assert.equal((await (await feed.GET()).text()).includes(post.slug), visible);
    assert.equal((await sitemap.default()).some(p => p.url.endsWith(post.slug)), visible);
    assert.equal((await media.GET(null, { params: Promise.resolve({ id: post.id }) })).status, visible ? 200 : 404);
    assert.equal((await article.generateMetadata(props)).robots.index, visible);
    if (visible) assert.ok(await article.default(props));
    else await assert.rejects(article.default(props), /404/);
  }
  assert.equal(coverReads, 1);
  for (const handler of [article, listing, media, feed, sitemap]) assert.equal(handler.dynamic, 'force-dynamic');
});
