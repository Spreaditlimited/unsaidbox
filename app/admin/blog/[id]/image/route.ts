import { revalidatePath } from "next/cache";
import { currentAdministrator } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/auth";
import { verifyCaptcha } from "@/lib/captcha.mjs";
import { InputError } from "@/lib/security.mjs";
import { updateBlogImage } from "@/lib/blog-image";
export const runtime = "nodejs";
export const maxDuration = 180;
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await currentAdministrator()) return new Response(null, { status: 401 });
  const { id } = await params;
  const image = await db().blogImage.findUnique({ where: { postId: id } });
  if (!image) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(image.image), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await currentAdministrator();
  if (!admin) return Response.json({ error: "Sign in to administration first." }, { status: 401 });
  // The admin cookie is scoped to /admin. Same-origin checks also protect local CAPTCHA bypass.
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    if (Number(request.headers.get("content-length")) > 3 * 1024 * 1024) throw new InputError("Upload a cover smaller than 2 MB.");
    const { id } = await params;
    const form = await request.formData();
    await verifyCaptcha(form, "blogImage");
    await rateLimit(`blog-image:${admin.id}`, 15, 3600);
    const file = form.get("file");
    if (file && (!(file instanceof File) || file.size > 2 * 1024 * 1024)) throw new InputError("Upload a JPG, PNG or WebP smaller than 2 MB.");
    const version = await updateBlogImage(id, admin.id, file instanceof File ? Buffer.from(await file.arrayBuffer()) : undefined);
    revalidatePath("/admin/blog", "layout");
    revalidatePath("/blog", "layout");
    return Response.json({ success: "Cover saved. The article’s publication status has not changed.", version });
  } catch (error) {
    return Response.json({ error: error instanceof InputError ? error.message : "The cover could not be saved. Please try again. Your existing cover has been kept." }, { status: 400 });
  }
}
