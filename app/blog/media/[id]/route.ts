import { db } from "@/lib/db";
import { publicBlogWhere } from "@/lib/blog-policy.mjs";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const image = await db().blogImage.findFirst({ where: { postId: id, post: publicBlogWhere() }, select: { image: true } });
  if (!image) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(new Uint8Array(image.image), { headers: { "Content-Type": "image/webp", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
