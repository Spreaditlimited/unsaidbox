import { v2 as cloudinary } from "cloudinary";

// Server-side only: never import this module into a client component.
function storage() {
  const get = name => {
    const value = process.env[name]?.trim();
    if (!value) throw new Error("UnsaidBox Cloudinary configuration is incomplete.");
    return value;
  };
  cloudinary.config({ cloud_name: get("UNSAIDBOX_CLOUDINARY_CLOUD_NAME"), api_key: get("UNSAIDBOX_CLOUDINARY_API_KEY"), api_secret: get("UNSAIDBOX_CLOUDINARY_API_SECRET"), secure: true });
  return cloudinary;
}

export function validBlogAssetId(value) {
  return typeof value === "string" && /^unsaidbox\/blog\/[a-zA-Z0-9-]{1,80}\/[a-f0-9]{32}$/.test(value);
}

export async function uploadBlogCover(image, postId, version) {
  const publicId = `unsaidbox/blog/${postId}/${version}`;
  if (!validBlogAssetId(publicId) || !Buffer.isBuffer(image) || image.length > 700_000) throw new Error("Invalid blog cover.");
  const result = await new Promise((resolve, reject) => {
    storage().uploader.upload_stream({ public_id: publicId, resource_type: "image", type: "authenticated", format: "webp", overwrite: false, use_filename: false, unique_filename: false, tags: ["unsaidbox", "blog-cover"], timeout: 60000 }, (error, result) => error ? reject(new Error("Cloudinary cover upload failed.")) : resolve(result)).end(image);
  });
  if (result?.public_id !== publicId || result?.format !== "webp" || result?.type !== "authenticated" || !result?.secure_url?.startsWith("https://res.cloudinary.com/")) throw new Error("Cloudinary returned an invalid cover reference.");
  return { cloudinaryPublicId: publicId, cloudinaryUrl: result.secure_url };
}

export async function readBlogCover(image) {
  // Only legacy records can use the database copy. Migrated images use Cloudinary.
  if (!image.cloudinaryPublicId) return Buffer.from(image.image);
  if (!validBlogAssetId(image.cloudinaryPublicId)) throw new Error("Invalid stored cover reference.");
  const url = storage().utils.private_download_url(image.cloudinaryPublicId, "webp", { resource_type: "image", type: "authenticated", expires_at: Math.floor(Date.now() / 1000) + 60, attachment: false });
  const response = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("Cloudinary cover is temporarily unavailable.");
  if (Number(response.headers.get("content-length")) > 700_000) throw new Error("Stored cover exceeds the size limit.");
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 700_000) throw new Error("Stored cover exceeds the size limit.");
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks);
  if (bytes.subarray(0, 4).toString() !== "RIFF" || bytes.subarray(8, 12).toString() !== "WEBP") throw new Error("Stored cover is not WebP.");
  return bytes;
}
