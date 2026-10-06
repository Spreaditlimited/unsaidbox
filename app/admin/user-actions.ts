"use server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireAdministrator } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyCaptcha } from "@/lib/captcha.mjs";
import { InputError, token } from "@/lib/security.mjs";
import { restoredAccountStatus } from "@/lib/admin-filters.mjs";
import { emailConfigured } from "@/lib/email-config.mjs";
import { queueEmail } from "@/lib/email-queue.mjs";
import { scheduleEmails } from "@/lib/email";
import type { Result } from "@/app/actions";

export async function manageUser(id: string, operation: string, _: Result, form: FormData): Promise<Result> {
  try {
    const administrator = await requireAdministrator();
    await verifyCaptcha(form, "manageUser");
    await rateLimit(`admin-user-action:${administrator.id}`, 30, 900);
    if (!["suspend", "restore", "revoke"].includes(operation)) throw new InputError("Invalid account action.");
    await db().$transaction(async tx => {
      const target = await tx.account.findUnique({ where: { id }, select: { id: true, username: true, status: true, emailVerifiedAt: true } });
      if (!target) throw new InputError("User not found.");
      if (form.get("confirmation") !== `@${target.username}`) throw new InputError("Enter the exact @username to confirm.");
      if (operation !== "revoke") {
        if (operation === "restore" && target.status !== "SUSPENDED") throw new InputError("This account is no longer suspended. Refresh before continuing.");
        if (operation === "suspend" && target.status === "SUSPENDED") throw new InputError("This account is already suspended.");
        const status = operation === "suspend" ? "SUSPENDED" : restoredAccountStatus(target.emailVerifiedAt);
        const changed = await tx.account.updateMany({ where: { id, status: target.status }, data: { status } });
        if (changed.count !== 1) throw new InputError("The account changed. Refresh and try again.");
        if (emailConfigured() && target.emailVerifiedAt) await queueEmail(tx, { accountId: id, kind: operation === "suspend" ? "SUSPENDED" : "RESTORED", key: `moderation:${token()}`, path: operation === "suspend" ? "mailto:hello@unsaidbox.com" : "/login" });
      }
      await tx.session.deleteMany({ where: { accountId: id } });
      await tx.auditEvent.create({ data: { actorId: administrator.id, targetId: id, action: `account:${operation}` } });
    });
    revalidatePath("/", "layout");
    scheduleEmails();
    return { success: operation === "revoke" ? "All current user sessions have been signed out." : operation === "suspend" ? "Account suspended and sessions signed out." : "Account restored. Email verification is still required if it was not completed." };
  } catch (error) {
    unstable_rethrow(error);
    return { error: error instanceof InputError ? error.message : "The account action could not be completed. Please try again." };
  }
}
