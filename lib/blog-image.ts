import "server-only";
import sharp from "sharp";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { InputError } from "./security.mjs";
import { blogImagePrompt } from "./blog-policy.mjs";

export async function prepareBlogImage(input: Buffer) {
  if (!input.length || input.length > 15 * 1024 * 1024) throw new InputError("The image is empty or too large.");
  const metadata = await sharp(input, { limitInputPixels: 25_000_000 }).metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format || "") || (metadata.pages || 1) > 1) throw new InputError("Use a static JPG, PNG or WebP image.");
  const image = await sharp(input, { limitInputPixels: 25_000_000, animated: false }).rotate().resize(1600, 900, { fit: "cover" }).webp({ quality: 80 }).toBuffer();
  if (image.length > 700_000) throw new InputError("The optimized cover is too large. Try a simpler image.");
  return image;
}

export async function updateBlogImage(id: string, adminId: string, upload?: Buffer) {
  if (!upload && (!process.env.UNSAIDBOX_OPENAI_API_KEY || !process.env.UNSAIDBOX_OPENAI_IMAGE_MODEL)) throw new InputError("Configure the UnsaidBox OpenAI API key and image model first.");
  const lock = randomBytes(24).toString("hex");
  const acquired = await db().blogPost.updateMany({
    where: { id, OR: [{ imageLock: null }, { imageLockedAt: { lt: new Date(Date.now() - 5 * 60000) } }] },
    data: { imageLock: lock, imageLockedAt: new Date() },
  });
  if (acquired.count !== 1) throw new InputError("A cover is already being processed, or the article was removed. Try again in a few minutes.");
  try {
    const post = await db().blogPost.findUniqueOrThrow({ where: { id } });
    let bytes = upload;
    if (!bytes) {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.UNSAIDBOX_OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: process.env.UNSAIDBOX_OPENAI_IMAGE_MODEL, prompt: blogImagePrompt(post), n: 1, size: "1536x1024", quality: "medium" }),
        signal: AbortSignal.timeout(150000),
      });
      if (!response.ok) throw new InputError(`Image generation was not completed (provider status ${response.status}). Check the OpenAI configuration or try again later.`);
      const payload = await response.json();
      const encoded = payload?.data?.[0]?.b64_json;
      if (typeof encoded !== "string" || encoded.length > 21_000_000) throw new InputError("The provider did not return a usable image.");
      bytes = Buffer.from(encoded, "base64");
    }
    const image = await prepareBlogImage(bytes);
    const version = randomBytes(16).toString("hex");
    await db().$transaction(async tx => {
      const owned = await tx.blogPost.updateMany({ where: { id, imageLock: lock }, data: { imageLock: null, imageLockedAt: null } });
      if (owned.count !== 1) throw new InputError("The article changed while the cover was being prepared. Please retry.");
      await tx.blogImage.upsert({ where: { postId: id }, create: { postId: id, image, version }, update: { image, version } });
      await tx.auditEvent.create({ data: { actorId: adminId, targetId: id, action: upload ? "blog:image-upload" : "blog:image-generate" } });
    });
    return version;
  } finally {
    await db().blogPost.updateMany({ where: { id, imageLock: lock }, data: { imageLock: null, imageLockedAt: null } });
  }
}
