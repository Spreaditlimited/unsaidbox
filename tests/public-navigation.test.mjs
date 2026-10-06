import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('public pages link to real flows without release-testing notices', async () => {
  for (const file of ['components/SiteShell.tsx', 'components/PublicHeader.tsx', 'app/page.tsx', 'app/login/page.tsx', 'app/start/page.tsx', 'app/explore/page.tsx', 'app/safety/page.tsx', 'app/cookies/page.tsx']) {
    assert.doesNotMatch(await source(file), /href="\/demo|testing release|test content|Product preview|fictional example|Before launch/i, file);
  }
  assert.match(await source('app/demo/layout.tsx'), /redirect\("\/start"\)/);
});

test('mobile menu exposes state, supports Escape and leaves signup outside navigation', async () => {
  const header = await source('components/PublicHeader.tsx');
  assert.match(header, /aria-expanded=\{open\}/);
  assert.match(header, /aria-controls="public-navigation"/);
  assert.match(header, /event.key === "Escape"/);
  assert.match(header, /trigger.current\?\.focus\(\)/);
  assert.match(header, /<\/nav>[\s\S]*href="\/start">Your own box/);
  const css = await source('app/globals.css');
  assert.match(css, /\.site-header nav\.public-navigation\.is-open\s*\{ display: flex; \}/);
  assert.match(css, /\.public-header-actions > \.button\s*\{[^}]*min-height: 44px;/);
});
