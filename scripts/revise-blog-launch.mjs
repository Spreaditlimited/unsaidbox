import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import nextEnv from '@next/env';
import { originalRemainingArticles, previousExpandedArticles, remainingArticles, revisedCourseArticle } from '../docs/blog-remaining-content.mjs';
import { launchArticles } from '../docs/blog-launch-content.mjs';
import { blogText, cleanBlogHtml, validatePublication } from '../lib/blog-policy.mjs';
import { publicationLabel, scheduledInstant } from '../lib/blog-time.mjs';
import { runtimeDatabaseUrl } from '../lib/runtime-database-url.mjs';

const root = resolve(import.meta.dirname, '..');
nextEnv.loadEnvConfig(root, true, { info() {}, error() {} });
const { PrismaClient } = createRequire(import.meta.url)('../generated/prisma');
const db = new PrismaClient({ datasources: { db: { url: runtimeDatabaseUrl(process.env.UNSAIDBOX_DATABASE_URL) } } });
const originals = [launchArticles[2], ...originalRemainingArticles];
const revised = [revisedCourseArticle, ...remainingArticles];
const hash = value => createHash('sha256').update(value).digest('hex');
const clean = value => cleanBlogHtml(value.trim());
try {
  const before = await db.blogPost.findMany({ where: { slug: { in: originals.map(p => p.slug) } }, include: { image: { select: { version: true, cloudinaryPublicId: true } } } });
  if (before.length !== 13) throw Error('Expected thirteen existing articles.');
  const changes = revised.map((post, index) => {
    const old = before.find(p => p.slug === post.slug);
    const contentHtml = clean(post.contentHtml);
    const words = blogText(contentHtml).split(/\s+/).length;
    validatePublication({ ...post, contentHtml });
    if (words < 1500 || !old.image?.cloudinaryPublicId) throw Error('Content or cover verification failed.');
    if (!old.published || old.publishAt?.getTime() !== scheduledInstant(`2026-10-${String(index + 8).padStart(2, '0')}`, '09:00').getTime()) throw Error('Schedule changed; review needed.');
    // Refuse to overwrite a human edit. Re-running the completed revision is safe.
    const previousExpansion = previousExpandedArticles.find(p => p.slug === post.slug)?.contentHtml;
    const accepted = [hash(clean(originals[index].contentHtml)), hash(contentHtml), ...(previousExpansion ? [hash(clean(previousExpansion))] : [])];
    if (!accepted.includes(hash(old.contentHtml))) throw Error(`Unexpected content edit: ${post.slug}`);
    return { old, contentHtml, words, changed: old.contentHtml !== contentHtml };
  });
  console.log(JSON.stringify({ mode: process.argv.includes('--confirm-revision') ? 'apply' : 'dry-run', articles: changes.map(p => ({ slug: p.old.slug, words: p.words, changed: p.changed, publication: publicationLabel(p.old.publishAt) })) }, null, 2));
  if (process.argv.includes('--confirm-revision')) {
    const folder = resolve(root, 'output/editorial-backups');
    await mkdir(folder, { recursive: true });
    const backup = resolve(folder, `blog-before-depth-${Date.now()}.json`);
    await writeFile(backup, JSON.stringify(before, null, 2), { flag: 'wx', mode: 0o600 });
    await db.$transaction(async tx => {
      for (const { old, contentHtml, changed } of changes) {
        if (!changed) continue;
        const saved = await tx.blogPost.updateMany({ where: { id: old.id, revision: old.revision, updatedAt: old.updatedAt, published: true, publishAt: old.publishAt }, data: { contentHtml, revision: { increment: 1 } } });
        if (saved.count !== 1) throw Error('Concurrent editorial change; transaction rolled back.');
        await tx.auditEvent.create({ data: { actorId: 'system:editorial-depth', action: 'blog:update', targetId: old.id } });
      }
    }, { timeout: 20000 });
    const after = await db.blogPost.findMany({ where: { id: { in: before.map(p => p.id) } }, include: { image: { select: { version: true, cloudinaryPublicId: true } } } });
    for (const p of changes) {
      const saved = after.find(x => x.id === p.old.id);
      if (saved.contentHtml !== p.contentHtml || saved.publishAt.getTime() !== p.old.publishAt.getTime() || JSON.stringify(saved.image) !== JSON.stringify(p.old.image)) throw Error('Post-write verification failed.');
    }
    console.log(`Verified ${after.length} expanded articles. Publication dates, slugs, permissions and Cloudinary covers preserved. Backup: ${backup}`);
    const report = await db.blogPost.findMany({ orderBy: { publishAt: 'asc' }, select: { id: true, slug: true, title: true, published: true, publishAt: true, contentHtml: true, image: { select: { version: true, cloudinaryPublicId: true } } } });
    await writeFile(resolve(root, 'docs/blog-release-20261007.json'), JSON.stringify({ verifiedAt: new Date().toISOString(), timezone: 'Europe/London', posts: report.map(({ contentHtml, ...p }) => ({ ...p, words: blogText(contentHtml).split(/\s+/).length, ukTime: publicationLabel(p.publishAt) })) }, null, 2) + '\n');
    const planPath = resolve(root, 'docs/blog-editorial-plan.json');
    const plan = JSON.parse(await readFile(planPath, 'utf8'));
    plan.status = 'Fifteen completed articles; thirteen queued articles expanded and verified in the live CMS. First two articles preserved.';
    plan.cadence = 'Remaining thirteen: one daily at 09:00 Europe/London, 8–20 October 2026.';
    plan.articles = report.map((p, index) => ({ order: index + 1, title: p.title, slug: p.slug, status: p.published && p.publishAt > new Date() ? 'scheduled' : 'published', publishAt: p.publishAt, source: index < 2 ? 'docs/blog-launch-content.mjs' : 'docs/blog-remaining-content.mjs', words: blogText(p.contentHtml).split(/\s+/).length }));
    await writeFile(planPath, JSON.stringify(plan, null, 2) + '\n');
  }
} catch (error) {
  // Never print driver errors or connection strings.
  console.error(error.name === 'Error' ? error.message : 'Editorial operation failed. No credentials printed; inspect database availability.');
  process.exitCode = 1;
} finally { await db.$disconnect(); }
