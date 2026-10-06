import sharp from "sharp";

export const MAX_AVATAR_UPLOAD = 2 * 1024 * 1024;
export const MAX_AVATAR_STORED = 48 * 1024;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function prepareAvatar(file) {
  if (!file || typeof file.arrayBuffer !== "function" || !file.size)
    throw new Error("Choose a photo first.");
  if (file.size > MAX_AVATAR_UPLOAD)
    throw new Error("Choose a photo smaller than 2 MB.");
  if (!AVATAR_TYPES.includes(file.type))
    throw new Error("Use a JPG, PNG, or WebP photo.");
  try {
    const input = Buffer.from(await file.arrayBuffer());
    if (input.length > MAX_AVATAR_UPLOAD) throw new Error("Too large");
    const image = sharp(input, {
      limitInputPixels: 20_000_000,
      failOn: "warning",
    });
    const metadata = await image.metadata();
    const expected = {
      "image/jpeg": "jpeg",
      "image/png": "png",
      "image/webp": "webp",
    };
    if (metadata.format !== expected[file.type] || (metadata.pages ?? 1) !== 1)
      throw new Error("Invalid image format");
    // Auto-orient, centre-crop, and re-encode; no source EXIF/GPS is retained.
    const output = await image
      .rotate()
      .resize(256, 256, { fit: "cover", position: "centre" })
      .webp({ quality: 80 })
      .toBuffer();
    if (output.length > MAX_AVATAR_STORED) throw new Error("Output too large");
    return output;
  } catch {
    throw new Error(
      "This photo could not be processed. Try a different JPG, PNG, or WebP image.",
    );
  }
}
