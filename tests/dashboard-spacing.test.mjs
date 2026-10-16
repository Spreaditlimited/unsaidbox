import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postcss from 'postcss';

test('dashboard spacing styles parse and keep changes scoped to workspaces', async () => {
  for (const file of ['app/workspace.css','app/admin/admin.css','app/blog.css','app/dashboard/billing/billing.module.css','app/dashboard/forms/[id]/insights/insights.module.css']) {
    const css = await readFile(file,'utf8');
    assert.doesNotThrow(()=>postcss.parse(css));
  }
  const shared = await readFile('app/workspace.css','utf8');
  assert.match(shared,/\.workspace \.app-form \.check \{ flex-wrap: nowrap;/);
  assert.match(shared,/\.workspace-main \{ padding-inline: 16px;/);
  assert.match(shared,/\.workspace details > summary \{ min-height: 44px;/);
});
test('feedback filters size calendars as grid items and collapse to one mobile column',async()=>{
  const css=await readFile('app/dashboard/forms/[id]/insights/insights.module.css','utf8');
  assert.match(css,/\.filters \{ display:grid; grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/\.filters \{ padding:20px; grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css,/\.response > details > :global\(\.app-form\) > fieldset \{ display:grid; gap:18px;/);
});
test('mobile admin cards override desktop table spacing and support notes have separators',async()=>{
  const css=await readFile('app/admin/admin.css','utf8');
  assert.ok(css.lastIndexOf('.admin-user-directory .admin-table td') > css.indexOf('.admin-table td {'));
  assert.match(css,/\.admin-main \.panel > article \{ padding:20px 0; border-top:/);
  assert.match(css,/\.admin-account-actions \{ display:grid; grid-template-columns:minmax\(0,1fr\)/);
});
