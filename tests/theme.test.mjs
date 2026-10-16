import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';import postcss from 'postcss';import {THEME_STORAGE_KEY,themeInitScript} from '../lib/theme-init.mjs';
import {css,palette,contrast} from './helpers/theme.mjs';
test('Light default, explicit system, malformed and blocked storage initialize before paint',()=>{
 for(const [saved,system,blocked,expected] of [[null,true,false,'light'],['dark',false,false,'dark'],['system',true,false,'dark'],['system',false,false,'light'],['bogus',true,false,'light'],['dark',true,true,'light']]){
  const root={dataset:{}};vm.runInNewContext(themeInitScript,{document:{documentElement:root},matchMedia:()=>({matches:system}),localStorage:{getItem:key=>{assert.equal(key,THEME_STORAGE_KEY);if(blocked)throw Error();return saved;}}});assert.equal(root.dataset.theme,expected);
 }
 assert.equal(THEME_STORAGE_KEY,'unsaidbox:appearance:v1');assert.ok(!themeInitScript.includes('effikos'));
});
test('all semantic text and filled controls retain AA contrast in both themes',()=>{
 for(const dark of [false,true]){const p=palette(dark);for(const surface of ['page','surface','surface-subtle','surface-tint'])for(const text of ['text','text-secondary','text-muted','accent'])assert.ok(contrast(p['--color-'+text],p['--color-'+surface])>=4.5,`${dark?'dark':'light'} ${text}/${surface}`);
 for(const family of ['success','warning','danger','info','purple']){assert.ok(contrast(p[`--color-${family}-text`],p[`--color-${family}-bg`])>=4.5,family);assert.ok(contrast(p['--color-on-accent'],p[`--color-${family}-solid`])>=4.5,family+' solid');}
 assert.ok(contrast(p['--color-on-accent'],p['--color-accent-solid'])>=4.5);
 }
});
test('all referenced palette roles exist and controls are available across app shells',async()=>{
 const allFiles=[];const {readdir}=await import('node:fs/promises');for(const root of ['app','components'])for(const f of await readdir(root,{recursive:true}))if(f.endsWith('.css'))allFiles.push(root+'/'+f);
 const defined=new Set([...css.matchAll(/(--color-[\w-]+)\s*:/g)].map(m=>m[1]));for(const file of allFiles){const text=await readFile(file,'utf8');assert.doesNotMatch(text,/var\(--var/);for(const m of text.matchAll(/var\((--color-[\w-]+)/g))assert.ok(defined.has(m[1]),file+': '+m[1]);}
 for(const file of ['components/PublicHeader.tsx','components/DashboardShell.tsx','components/AdminShell.tsx','components/AuthShell.tsx','components/SenderForm.tsx','app/f/[id]/page.tsx'])assert.match(await readFile(file,'utf8'),/<ThemePicker\s*\//);
 const layout=await readFile('app/layout.tsx','utf8');assert.match(layout,/<head><script dangerouslySetInnerHTML/);assert.match(layout,/suppressHydrationWarning/);
});
test('appearance remains local and exports retain their independent palette',async()=>{
 const source=await readFile('components/ThemeProvider.tsx','utf8');assert.doesNotMatch(source,/fetch\(|document\.cookie|analytics|gtag|@\/lib\/db/);
 const studio=await readFile('components/ShareStudio.tsx','utf8');assert.match(studio,/#D0C9FF/);assert.doesNotMatch(studio,/useTheme/);
 assert.match(css,/@media print/);assert.match(await readFile('components/ThemePicker.tsx','utf8'),/<Picker/);
});
test('the fixed paper illustration stays readable when the surrounding theme changes',async()=>{
 const home=postcss.parse(await readFile('app/home.module.css','utf8'));
 const declarations={};
 home.walkRules(rule=>{if(['.cardPreview','.cardPreview p'].includes(rule.selector))rule.walkDecls(decl=>{if(['color','background'].includes(decl.prop))declarations[decl.prop]=decl.value;});});
 for(const dark of [false,true]){
  const p=palette(dark),resolve=value=>value.replace(/var\((--[\w-]+)\)/g,(_,key)=>key==='--ink'?p['--color-text']:p[key]);
  assert.ok(contrast(resolve(declarations.color),resolve(declarations.background))>=4.5,'paper illustration in '+(dark?'dark':'light'));
 }
});
