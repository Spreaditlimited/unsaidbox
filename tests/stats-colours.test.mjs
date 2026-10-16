import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {palette,contrast} from './helpers/theme.mjs';
test('subtle stats palette retains AA contrast for body text and captions in both themes',async()=>{
 for(const file of ['app/admin/admin.css','app/dashboard/forms/[id]/insights/insights.module.css']){const css=await readFile(file,'utf8');for(const family of ['purple','success','info','warning']){assert.ok(css.includes(`--color-${family}-bg`));for(const dark of [false,true]){const p=palette(dark);for(const text of ['text','text-secondary'])assert.ok(contrast(p[`--color-${family}-bg`],p[`--color-${text}`])>=4.5);}}}
});
