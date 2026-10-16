import { db } from "@/lib/db";
import { publicBlogWhere } from "@/lib/blog-policy.mjs";
import { readBlogCover } from "@/lib/blog-cloudinary.mjs";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const image = await db().blogImage.findFirst({ where: { postId: id, post: publicBlogWhere() }, select: { image: true, cloudinaryPublicId: true } });
  if (!image) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  try {
    return new Response(new Uint8Array(await readBlogCover(image)), { headers: { "Content-Type": "image/webp", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } });
  }
}
