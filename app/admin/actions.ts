"use server";
import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/auth";
import { beginAdministratorSession, endAdministratorSession, requireAdministrator } from "@/lib/admin-auth";
import { InputError, textValue, verifyPassword, hashPassword } from "@/lib/security.mjs";
import { verifyCaptcha } from "@/lib/captcha.mjs";
import type { Result } from "@/app/actions";

function failure(error: unknown): Result {
  unstable_rethrow(error);
  return { error: error instanceof InputError ? error.message : "Administrator request could not be completed. Check that administration has been set up and try again." };
}

export async function adminLogin(_: Result, form: FormData): Promise<Result> {
  try {
    await verifyCaptcha(form, "adminLogin");
    const email = textValue(form.get("email"), "Email", 254).toLowerCase();
    await rateLimit("admin-login:global", 50, 900);
    await rateLimit(`admin-login:${email}`, 5, 900);
    const administrator = await db().administrator.findUnique({ where: { email } });
    const dummy = `scrypt-v1:${"0".repeat(32)}:${"0".repeat(128)}`;
    const valid = await verifyPassword(form.get("password"), administrator?.passwordHash ?? dummy);
    if (!valid || !administrator?.active) return { error: "Administrator email or password not recognised." };
    await beginAdministratorSession(administrator.id);
  } catch (error) { return failure(error); }
  redirect("/admin");
}

export async function adminLogout() {
  await endAdministratorSession();
  redirect("/admin/login");
}

export async function saveAdminSettings(_: Result, form: FormData): Promise<Result> {
  try {
    const administrator = await requireAdministrator();
    await verifyCaptcha(form, "saveAdminSettings");
    await rateLimit(`admin-settings:${administrator.id}`, 5, 900);
    const displayName = textValue(form.get("displayName"), "Display name", 80);
    const record = await db().administrator.findUniqueOrThrow({ where: { id: administrator.id } });
    if (!await verifyPassword(form.get("currentPassword"), record.passwordHash)) throw new InputError("Current password is incorrect.");
    const newPassword = form.get("newPassword");
    const passwordHash = newPassword ? await hashPassword(newPassword) : undefined;
    await db().$transaction(async (tx) => {
      await tx.administrator.update({ where: { id: administrator.id }, data: { displayName, passwordHash } });
      if (passwordHash) await tx.administratorSession.deleteMany({ where: { administratorId: administrator.id } });
      await tx.auditEvent.create({ data: { actorId: administrator.id, targetId: administrator.id, action: "admin:settings" } });
    });
    if (passwordHash) { await endAdministratorSession(); redirect("/admin/login?passwordChanged=1"); }
    revalidatePath("/admin", "layout");
    return { success: "Administrator settings saved." };
  } catch (error) { return failure(error); }
}
