import test from "node:test";
import assert from "node:assert/strict";
import { cardFormats, layoutCard } from "../lib/card-layout.mjs";
import { readdir, readFile } from "node:fs/promises";

test("share studio puts branding before audience export actions", async () => {
  const source = await readFile("components/ShareStudio.tsx", "utf8");
  const preview = source.indexOf('<aside id="share-preview"');
  const design = source.indexOf('Make it feel like you', preview);
  const branding = source.indexOf('Make this card yours', design);
  const audience = source.indexOf('Take it to your audience', branding);
  const download = source.indexOf('onClick={() => exportCard(false)}', audience);
  const share = source.indexOf('onClick={() => exportCard(true)}', audience);
  assert.ok(preview > 0 && design > preview && branding > design && audience > branding);
  assert.ok(download > audience && share > download);
  assert.equal(source.indexOf('onClick={() => exportCard(false)}'), download);
  assert.equal(source.indexOf('onClick={() => exportCard(true)}'), share);
});

test("only the original validated Facebook link appears above sharing buttons", async () => {
  const source = await readFile("components/ShareStudio.tsx", "utf8");
  assert.ok(source.includes('facebookPostUrl(initialPostUrl)'));
  assert.ok(source.includes('{validPost ? <div className={styles.originalPost}>'));
  assert.ok(!source.includes('id="facebook-post"'));
  assert.ok(!source.includes('setPostUrl'));
  const audience = source.indexOf('Take it to your audience');
  const link = source.indexOf('Open original Facebook post', audience);
  const copy = source.indexOf('onClick={copyText}', audience);
  const download = source.indexOf('onClick={() => exportCard(false)}', audience);
  assert.ok(link > audience && copy > link && download > copy);
  assert.equal(source.indexOf('onClick={copyText}'), copy);
});

test("all export formats have intended pixel dimensions", () => {
  assert.deepEqual(
    Object.values(cardFormats).map(({ width, height }) => [width, height]),
    [
      [1080, 1080],
      [1080, 1350],
      [1080, 1920],
    ],
  );
});
test("long responses paginate instead of shrinking or dropping lines", () => {
  const text = Array.from({ length: 120 }, (_, i) => `Line ${i + 1}`).join(
    "\n",
  );
  for (const format of Object.keys(cardFormats)) {
    const layout = layoutCard(text, format, (text) => text.length * 24);
    assert.ok(layout.pages.length > 1);
    assert.equal(layout.pages.flat().join("\n"), text);
    for (const page of layout.pages)
      assert.ok(
        layout.startY + (page.length - 1) * layout.lineHeight <=
          layout.footerY - 80,
      );
  }
});
test("empty text still provides one empty preview page", () => {
  assert.deepEqual(layoutCard("", "square", () => 0).pages, [[""]]);
});
test("invalid format is rejected", () => {
  assert.throws(() => layoutCard("hello", "unknown", () => 1));
});
test("fictional demo pages remain isolated from live account and message actions", async () => {
  for (const directory of ["app/demo"]) {
    const root = new URL(`../${directory}/`, import.meta.url);
    const files = await readdir(root, { recursive: true });
    for (const file of files.filter((file) => /\.(tsx?|jsx?)$/.test(file))) {
      const source = await readFile(new URL(file, root), "utf8");
      assert.doesNotMatch(
        source,
        /@prisma\/client|generated\/prisma|UNSAIDBOX_DATABASE_URL|@\/app\/actions|\bfetch\(|localStorage|sessionStorage/,
        file,
      );
    }
  }
  const composer = await readFile(
    new URL("../components/DemoComposer.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    composer,
    /@\/app\/actions|\bfetch\(|localStorage|sessionStorage/,
  );
});

test('optional bold question and normal answer paginate without dropping text',()=>{
  const question=Array.from({length:30},(_,i)=>`Question line ${i}`).join('\n');
  const answer=Array.from({length:50},(_,i)=>`Answer line ${i}`).join('\n');
  for(const format of Object.keys(cardFormats)){
    let measuredBold=0;
    const layout=layoutCard(answer,format,s=>s.length*24,{question,measureQuestion:s=>{measuredBold++;return s.length*27;}});
    assert.ok(measuredBold>0);assert.ok(layout.pages.length>1);
    const lines=layout.pageLines.flat();
    assert.equal(lines.filter(l=>l.kind==='question').map(l=>l.text).join('\n'),question);
    assert.equal(lines.filter(l=>l.kind==='answer').map(l=>l.text).join('\n'),answer);
    for(const page of layout.pages)assert.ok(layout.startY+(page.length-1)*layout.lineHeight<=layout.footerY-80);
    assert.equal(layout.hasQuestion,true);
  }
  assert.equal(layoutCard('Answer','square',s=>s.length).hasQuestion,false);
});
