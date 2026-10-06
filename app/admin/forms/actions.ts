"use server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireAdministrator } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyCaptcha } from "@/lib/captcha.mjs";
import { InputError } from "@/lib/security.mjs";
import type { Result } from "@/app/actions";
export async function moderateFeedbackForm(
  id: string,
  _: Result,
  form: FormData,
): Promise<Result> {
  try {
    const admin = await requireAdministrator();
    await verifyCaptcha(form, "moderateFeedbackForm");
    await rateLimit(`admin-forms:${admin.id}`, 60, 3600);
    const operation = form.get("operation");
    if (!["block", "unblock"].includes(String(operation)))
      throw new InputError("Choose a valid action.");
    await db().$transaction(async (tx) => {
      const changed = await tx.feedbackForm.updateMany({
        where: { id, revision: Number(form.get("revision")) },
        data: {
          blocked: operation === "block",
          acceptingResponses: false,
          revision: { increment: 1 },
        },
      });
      if (!changed.count)
        throw new InputError("This form changed. Reload before moderating.");
      await tx.auditEvent.create({
        data: {
          actorId: admin.id,
          targetId: id,
          action: `feedback-form:${operation}`,
        },
      });
    });
    revalidatePath("/admin/forms");
    revalidatePath(`/f/${id}`);
    revalidatePath("/dashboard/forms", "layout");
    return {
      success:
        operation === "block"
          ? "Form paused. Its public link is unavailable."
          : "Restriction removed. The owner can reopen responses.",
    };
  } catch (error) {
    unstable_rethrow(error);
    return {
      error:
        error instanceof InputError
          ? error.message
          : "This form could not be updated.",
    };
  }
}
