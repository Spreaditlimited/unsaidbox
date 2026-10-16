// Read-only integration check. No fake posts, publication changes or auth sessions.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import { runtimeDatabaseUrl } from '../lib/runtime-database-url.mjs';
import { publicBlogWhere } from '../lib/blog-policy.mjs';
import { publicationFields } from '../lib/blog-time.mjs';
import { revisedCourseArticle, remainingArticles } from '../docs/blog-remaining-content.mjs';
const root = resolve(import.meta.dirname, '..');
nextEnv.loadEnvConfig(root, true, { info() {}, error() {} });
const { PrismaClient } = createRequire(import.meta.url)('../generated/prisma');
// Use the production pool policy with the trusted bundled CA; never log the URL.
const url = runtimeDatabaseUrl(process.env.UNSAIDBOX_DATABASE_URL, { VERCEL: '1' }, root);
const db = new PrismaClient({ datasources: { db: { url } } });
try {
  const started = Date.now();
  const connections = await Promise.all(Array.from({ length: 12 }, () => db.$queryRaw`SELECT CONNECTION_ID() AS id`));
  assert.equal(new Set(connections.map(rows => String(rows[0].id))).size, 1);
  const posts = await db.blogPost.findMany({ where: { slug: { in: [revisedCourseArticle, ...remainingArticles].map(p => p.slug) } }, orderBy: { publishAt: 'asc' }, select: { id: true, slug: true, published: true, publishAt: true } });
  assert.equal(posts.length, 13);
  for (const [index, post] of posts.entries()) {
    assert.deepEqual(publicationFields(post.publishAt), { date: `2026-10-${String(index + 8).padStart(2, '0')}`, time: '09:00' });
    assert.equal(post.published, true);
    const before = new Date(post.publishAt.getTime() - 1);
    assert.equal(await db.blogPost.count({ where: { id: post.id, ...publicBlogWhere(before) } }), 0);
    assert.equal(await db.blogPost.count({ where: { id: post.id, ...publicBlogWhere(post.publishAt) } }), 1);
    assert.equal(await db.blogImage.count({ where: { postId: post.id, post: publicBlogWhere(before) } }), 0);
    assert.equal(await db.blogImage.count({ where: { postId: post.id, post: publicBlogWhere(post.publishAt) } }), 1);
  }
  console.log(JSON.stringify({ concurrentQueries: 12, distinctConnections: 1, elapsedMs: Date.now() - started, scheduledArticles: 13, publicationBoundariesVerified: 13, coverBoundariesVerified: 13, timezone: 'Europe/London', writes: 0 }));
} catch { console.error('Read-only pool/schedule verification failed. Credentials and content omitted.'); process.exitCode = 1; }
finally { await db.$disconnect(); }
