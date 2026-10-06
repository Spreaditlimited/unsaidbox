import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import {
  prepareAvatar,
  MAX_AVATAR_UPLOAD,
  MAX_AVATAR_STORED,
} from "../lib/avatar-image.mjs";

test("profile photos are cropped, compressed and stripped of source metadata", async () => {
  const bytes = await sharp({
    create: { width: 600, height: 400, channels: 3, background: "#5850b8" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const output = await prepareAvatar(
    new File([bytes], "photo.jpg", { type: "image/jpeg" }),
  );
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 256);
  assert.equal(metadata.height, 256);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.orientation, undefined);
  assert.ok(output.length <= MAX_AVATAR_STORED);
});

test("profile photo validation rejects empty, oversized and non-image uploads", async () => {
  await assert.rejects(prepareAvatar(null), /Choose a photo/);
  await assert.rejects(
    prepareAvatar(new File([], "empty.png", { type: "image/png" })),
    /Choose a photo/,
  );
  await assert.rejects(
    prepareAvatar({
      size: MAX_AVATAR_UPLOAD + 1,
      type: "image/png",
      arrayBuffer() {
        throw Error("must not read");
      },
    }),
    /smaller than/,
  );
  await assert.rejects(
    prepareAvatar(new File(["<svg/>"], "photo.svg", { type: "image/svg+xml" })),
    /JPG, PNG/,
  );
  await assert.rejects(
    prepareAvatar(new File(["<svg/>"], "photo.png", { type: "image/png" })),
    /could not be processed/,
  );
  const png = await sharp({
    create: { width: 10, height: 10, channels: 3, background: "#fff" },
  })
    .png()
    .toBuffer();
  await assert.rejects(
    prepareAvatar(new File([png], "fake.jpg", { type: "image/jpeg" })),
    /could not be processed/,
  );
});

test("profile image route is private and never accepts a client account ID", async () => {
  const route = await readFile("app/api/account/avatar/route.ts", "utf8");
  assert.match(route, /await currentAccount\(\)/);
  assert.match(route, /accountId: account.id/);
  assert.match(route, /private, no-store/);
  assert.doesNotMatch(route, /searchParams|params|formData/);
  const action = await readFile("app/avatar-actions.ts", "utf8");
  assert.match(action, /await requireAccount\(\)/);
  assert.doesNotMatch(action, /form.get\(["']accountId/);
});
