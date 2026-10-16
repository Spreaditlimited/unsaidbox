import assert from 'node:assert/strict';
const origin = process.argv[2] || 'http://localhost:3001';
if (!['http://localhost:3001', 'https://unsaidbox.com'].includes(origin)) throw Error('Choose the known local or live site.');
const hiddenSlug = 'course-evaluation-questions';
const liveSlug = 'how-to-create-an-anonymous-feedback-form';
const routes = [
  ['/blog', 200], ['/blog/feed', 200], ['/sitemap.xml', 200],
  [`/blog/${liveSlug}`, 200], [`/blog/${hiddenSlug}`, 404],
  ['/blog/media/cmuxbi2hc0000c9ki2ivzwric', 200],
  ['/blog/media/cmuxbi30c0004c9ki7ewe0f7e', 404],
  ['/admin/blog', 307],
];
for (const [path, status] of routes) {
  const response = await fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, status, path);
  if (path === '/admin/blog') assert.match(response.headers.get('location'), /\/admin\/login/);
  else if (path.includes('/media/') && status === 200) {
    assert.match(response.headers.get('content-type'), /image\/webp/);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  } else if (['/blog', '/blog/feed', '/sitemap.xml'].includes(path)) {
    const text = await response.text();
    assert.ok(text.includes(liveSlug), `${path}: published article missing`);
    assert.ok(!text.includes(hiddenSlug), `${path}: future article leaked`);
  }
  console.log(`${origin}${path}: ${status} verified`);
}
