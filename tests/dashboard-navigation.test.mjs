import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';

test('billing uses a payment card while settings retains its own icon', async () => {
  const source = await readFile('components/DashboardNav.tsx', 'utf8');
  assert.match(source, /id: "billing"[^\n]+icon: "payment"/);
  assert.match(source, /id: "settings",\s+label: "Settings",\s+href: "\/dashboard\/settings",\s+icon: "settings"/);
  const icons = await readFile('components/ui/Icon.tsx', 'utf8');
  assert.match(icons, /payment: "M4 5/);
});

test('All questions returns to the existing questions-list route', async () => {
  const source = await readFile('app/dashboard/questions/new/page.tsx', 'utf8');
  assert.match(source, /href="\/dashboard\?view=questions"[^>]*>← All questions<\/Link>/);
  assert.doesNotMatch(source, /href="\/dashboard\/questions"/);
  const dashboard = await readFile('app/dashboard/page.tsx', 'utf8');
  assert.match(dashboard, /query\.view === "questions"/);
});

test('shared desktop/mobile dashboard navigation starts with Overview and retains active links',async()=>{
  const source=await readFile('components/DashboardNav.tsx','utf8');
  for(const [path,section,activeHref] of [['/dashboard','overview','/dashboard'],['/dashboard','inbox','/dashboard?view=inbox'],['/dashboard/forms','forms','/dashboard/forms'],['/dashboard/follow-ups','followups','/dashboard/follow-ups']]){
    const exports={};
    const modules={
      'react/jsx-runtime':jsx,'next/link':{default:props=>jsx.jsx('a',{href:props.href,'aria-current':props['aria-current'],children:props.children})},
      'next/navigation':{usePathname:()=>path},'./ui/Icon':{Icon:()=>null},
      './forms/TemplateContinuation':{TemplateContinuation:()=>null},
    };
    vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>modules[name]});
    const html=renderToStaticMarkup(jsx.jsx(exports.DashboardNav,{section}));
    const links=[...html.matchAll(/<a ([^>]+)>([^<]+)<\/a>/g)];
    assert.deepEqual(links.map(m=>m[2]),['Overview','Inbox','Your questions','Forms &amp; feedback','Private follow-ups','Plan &amp; billing','Export centre','Settings']);
    const active=links.filter(m=>m[1].includes('aria-current="page"'));
    assert.equal(active.length,1);assert.ok(active[0][1].includes(`href="${activeHref}"`));
  }
});
