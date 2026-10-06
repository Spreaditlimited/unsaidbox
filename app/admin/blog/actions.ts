"use server";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { requireAdministrator } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyCaptcha } from "@/lib/captcha.mjs";
import { InputError } from "@/lib/security.mjs";
import { readBlogForm, publicationDate, validatePublication } from "@/lib/blog-policy.mjs";
import type { Result } from "@/app/actions";

function failure(error: unknown): Result {
  unstable_rethrow(error);
  if (error instanceof InputError) return { error: error.message };
  if ((error as { code?: string })?.code === "P2002") return { error: "That URL slug is already reserved by another article." };
  return { error: "The blog change could not be saved. Check that the blog tables are installed and try again." };
}
function refresh(id: string) {
  revalidatePath("/admin/blog");
  revalidatePath(`/admin/blog/${id}`);
  revalidatePath("/blog", "layout");
  revalidatePath("/sitemap.xml");
}
export async function saveBlog(id: string | null, _: Result, form: FormData): Promise<Result> {
  let savedId = id;
  try {
    const admin = await requireAdministrator();
    await verifyCaptcha(form, "saveBlog");
    await rateLimit(`blog-save:${admin.id}`, 60, 900);
    const data = readBlogForm(form);
    const operation = String(form.get("operation") || "draft");
    if (!["draft", "publish", "schedule"].includes(operation)) throw new InputError("Choose a publication action.");
    if (operation !== "draft") validatePublication(data);
    let publishAt: Date | null = null;
    if (operation === "schedule") {
      publishAt = publicationDate(String(form.get("publishDate") || ""), String(form.get("publishTime") || ""));
      if (publishAt <= new Date()) throw new InputError("Choose a future publication time in UTC.");
    }
    await db().$transaction(async tx => {
      const previous = id ? await tx.blogPost.findUnique({ where: { id } }) : null;
      if (id && !previous) throw new InputError("Article not found.");
      if (previous && previous.revision !== Number(form.get("revision"))) throw new InputError("This article changed in another tab. Reload before saving.");
      const alias = await tx.blogSlug.findUnique({ where: { slug: data.slug } });
      if (alias && alias.postId !== id) throw new InputError("That URL slug is reserved by another article.");
      if (operation === "publish") publishAt = previous?.published && previous.publishAt && previous.publishAt <= new Date() ? previous.publishAt : new Date();
      const update = { ...data, published: operation !== "draft", publishAt };
      if (previous) {
        const result = await tx.blogPost.updateMany({ where: { id: previous.id, revision: previous.revision }, data: { ...update, revision: { increment: 1 } } });
        if (result.count !== 1) throw new InputError("This article changed. Reload before saving.");
      } else {
        const created = await tx.blogPost.create({ data: update });
        savedId = created.id;
      }
      if (!alias) await tx.blogSlug.create({ data: { slug: data.slug, postId: savedId! } });
      await tx.auditEvent.create({ data: { actorId: admin.id, targetId: savedId!, action: `blog:${operation}` } });
    });
  } catch (error) { return failure(error); }
  refresh(savedId!);
  redirect(`/admin/blog/${savedId}?saved=1`);
}
export async function deleteBlog(id: string, _: Result, form: FormData): Promise<Result> {
  try {
    const admin = await requireAdministrator();
    await verifyCaptcha(form, "delete");
    await rateLimit(`blog-delete:${admin.id}`, 20, 900);
    if (form.get("confirm") !== "DELETE") throw new InputError("Type DELETE to confirm.");
    await db().$transaction(async tx => {
      const result = await tx.blogPost.deleteMany({ where: { id, published: false } });
      if (result.count !== 1) throw new InputError("Unpublish or cancel the schedule before deleting this article.");
      await tx.auditEvent.create({ data: { actorId: admin.id, targetId: id, action: "blog:delete" } });
    });
  } catch (error) { return failure(error); }
  refresh(id);
  redirect("/admin/blog");
}
