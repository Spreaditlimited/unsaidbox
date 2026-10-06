import test from "node:test";
import assert from "node:assert/strict";
import { cardFormats, layoutCard } from "../lib/card-layout.mjs";
import { readdir, readFile } from "node:fs/promises";

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
