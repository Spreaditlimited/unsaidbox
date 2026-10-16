"use server";
import { recordMilestone } from '@/lib/account-activity';
import { scheduleEmails } from '@/lib/email';
import { lockPlanOwner, assertActiveSlot, consumeSubmission } from "@/lib/plans";
import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAccount, rateLimit } from "@/lib/auth";
import { verifyCaptcha } from "@/lib/captcha.mjs";
import { InputError } from "@/lib/security.mjs";
import { digest } from '@/lib/security.mjs';
import { followupsReady } from '@/lib/followups';
import { FOLLOWUP_DAYS, validFollowupToken } from '@/lib/followup-policy.mjs';
import {
  FormInputError,
  readFeedbackForm,
  readAnswers,
  assertFormAccepting,
  parseQuestions,
} from "@/lib/form-policy.mjs";
import { getFormTemplate } from "@/lib/form-templates";
import { prepareAvatar } from "@/lib/avatar-image.mjs";
import type { Result } from "@/app/actions";

function failure(error: unknown): Result {
  unstable_rethrow(error);
  if (error instanceof FormInputError || error instanceof InputError)
    return { error: error.message };
  console.error("Feedback form operation failed", {
    code: (error as { code?: string })?.code ?? "UNKNOWN",
  });
  return {
    error:
      "We couldn’t save that just now. Please try again. Your form may need the latest database tables.",
  };
}
function refresh(id: string) {
  revalidatePath("/dashboard/forms");
  revalidatePath(`/dashboard/forms/${id}`);
  revalidatePath(`/f/${id}`);
}
export async function saveFeedbackForm(
  id: string | null,
  _: Result,
  form: FormData,
): Promise<Result> {
  let savedId = id;
  try {
    const account = await requireAccount();
    await verifyCaptcha(form, "saveFeedbackForm");
    await rateLimit(`form-save:${account.id}`, 60, 3600);
    const data = readFeedbackForm(form);
    const operation = form.get("operation");
    if (operation !== "draft" && operation !== "publish")
      throw new FormInputError("Choose save draft or publish.");
    const file = form.get("image");
    let image: Uint8Array<ArrayBuffer> | undefined;
    if (file instanceof File && file.size) {
      try {
        image = new Uint8Array(await prepareAvatar(file));
      } catch (error) {
        throw new FormInputError((error as Error).message);
      }
    }
    await db().$transaction(async (tx) => {
      await lockPlanOwner(tx, account.id);
      const previous = id
        ? await tx.feedbackForm.findFirst({
            where: { id, accountId: account.id },
          })
        : null;
      if (id && !previous) throw new FormInputError("Form not found.");
      if (previous?.blocked)
        throw new FormInputError(
          "This form has been paused by administration. Contact support.",
        );
      if (
        previous?.locked &&
        (JSON.stringify(previous.questions) !==
          JSON.stringify(data.questions) ||
          previous.allowSharing !== data.allowSharing)
      ) {
        // Compare normalized structures: MySQL JSON key order is not guaranteed.
        if (
          JSON.stringify(parseQuestions(previous.questions)) !==
            JSON.stringify(data.questions) ||
          previous.allowSharing !== data.allowSharing
        )
          throw new FormInputError(
            "Published questions and sharing permissions are locked. Duplicate this form to change them.",
          );
      }
      const publish = operation === "publish";
      if (publish) await assertActiveSlot(tx, account.id, 'forms', Boolean(previous?.linkActive && previous.acceptingResponses));
      const values = {
        ...data,
        ...(image
          ? { image }
          : form.get("removeImage") === "on"
            ? { image: null }
            : {}),
        ...(publish
          ? { locked: true, linkActive: true, acceptingResponses: true }
          : {}),
      };
      if (previous) {
        const result = await tx.feedbackForm.updateMany({
          where: {
            id: previous.id,
            accountId: account.id,
            revision: Number(form.get("revision")),
            blocked: false,
          },
          data: { ...values, revision: { increment: 1 } },
        });
        if (!result.count)
          throw new FormInputError(
            "This form changed in another tab. Reload before saving.",
          );
      } else {
        const templateId = getFormTemplate(
          String(form.get("templateId")),
        ).templateId;
        const created = await tx.feedbackForm.create({
          data: { ...values, accountId: account.id, templateId },
        });
        savedId = created.id;
      }
    }, { isolationLevel: 'ReadCommitted' });
    if(!id)recordMilestone(account.id,'form');
  } catch (error) {
    return failure(error);
  }
  refresh(savedId!);
  redirect(`/dashboard/forms/${savedId}?saved=1`);
}
export async function changeFeedbackForm(
  id: string,
  _: Result,
  form: FormData,
): Promise<Result> {
  let duplicateId: string | undefined;
  try {
    const a = await requireAccount();
    await verifyCaptcha(form, "changeFeedbackForm");
    await rateLimit(`form-change:${a.id}`, 60, 3600);
    const operation = String(form.get("operation"));
    await db().$transaction(async (tx) => {
      await lockPlanOwner(tx, a.id);
      const previous = await tx.feedbackForm.findFirst({
        where: { id, accountId: a.id },
      });
      if (!previous) throw new FormInputError("Form not found.");
      if (operation === "duplicate") {
        const copy = await tx.feedbackForm.create({
          data: {
            accountId: a.id,
            title: `${previous.title.slice(0, 150)} (copy)`,
            description: previous.description,
            thankYou: previous.thankYou,
            templateId: previous.templateId,
            questions: previous.questions!,
            theme: previous.theme,
            allowSharing: previous.allowSharing,
            image: previous.image,
          },
        });
        duplicateId = copy.id;
        return;
      }
      if (!["pause", "resume", "disable"].includes(operation))
        throw new FormInputError("Choose a valid action.");
      if (previous.blocked || !previous.locked)
        throw new FormInputError("This form cannot be opened right now.");
      if (operation === 'resume') await assertActiveSlot(tx, a.id, 'forms', previous.linkActive && previous.acceptingResponses);
      const result = await tx.feedbackForm.updateMany({
        where: {
          id,
          accountId: a.id,
          revision: Number(form.get("revision")),
          blocked: false,
        },
        data: {
          linkActive: operation !== "disable",
          acceptingResponses: operation === "resume",
          revision: { increment: 1 },
        },
      });
      if (!result.count)
        throw new FormInputError(
          "This form changed. Reload the page and try again.",
        );
    }, { isolationLevel: 'ReadCommitted' });
  } catch (error) {
    return failure(error);
  }
  refresh(id);
  if (duplicateId) redirect(`/dashboard/forms/${duplicateId}/edit`);
  return { success: "Form availability updated." };
}
export async function deleteFeedbackForm(
  id: string,
  _: Result,
  form: FormData,
): Promise<Result> {
  try {
    const a = await requireAccount();
    await verifyCaptcha(form, "delete");
    if (form.get("confirm") !== "DELETE")
      throw new FormInputError("Type DELETE to confirm.");
    const deleted = await db().feedbackForm.deleteMany({
      where: { id, accountId: a.id, linkActive: false },
    });
    if (!deleted.count)
      throw new FormInputError(
        "Disable the share link before deleting this form.",
      );
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/dashboard/forms");
  redirect("/dashboard/forms");
}
export async function submitFeedbackForm(
  id: string,
  _: Result,
  form: FormData,
): Promise<Result> {
  try {
    await verifyCaptcha(form, "submitFeedbackForm");
    if (form.get("website"))
      throw new FormInputError("Your response could not be accepted.");
    if (form.get("privacy") !== "on")
      throw new FormInputError("Please confirm the privacy notice.");
    const key = String(form.get("requestKey") ?? "");
    if (!/^[a-f0-9-]{36}$/.test(key))
      throw new FormInputError("Reload the form before sending.");
    await rateLimit(`feedback-submit:${id}`, 300, 3600);
    let thankYou = "Thank you. Your response has been received privately.";
    let followupLink: string | undefined;
    let createdEntry=false;
    const followupToken = form.get('allowFollowup') === 'on' ? String(form.get('followupToken') ?? '') : null;
    if (followupToken !== null && (!validFollowupToken(followupToken) || !(await followupsReady()))) throw new FormInputError('Reload the form before requesting a private follow-up.');
    const target = await db().feedbackForm.findUnique({ where: { id }, select: { accountId: true } });
    if (!target) throw new FormInputError('This form is not available.');
    await db().$transaction(async (tx) => {
      await lockPlanOwner(tx, target.accountId);
      // Lock the parent row before checking state: closing a form and submitting cannot race.
      const gate = await tx.feedbackForm.updateMany({
        where: {
          id,
          linkActive: true,
          acceptingResponses: true,
          blocked: false,
          account: { status: "ACTIVE" },
        },
        data: { responseCount: { increment: 1 } },
      });
      if (!gate.count)
        throw new FormInputError(
          "This form is not accepting responses right now.",
        );
      const current = await tx.feedbackForm.findUnique({
        where: { id },
        include: { account: { select: { status: true } } },
      });
      assertFormAccepting(current);
      if (Number(form.get("revision")) !== current!.revision)
        throw new FormInputError(
          "This form changed. Reload it and review the questions before sending.",
        );
      const answers = readAnswers(current!.questions, form);
      const previous = await tx.feedbackEntry.findUnique({
        where: { formId_requestKey: { formId: id, requestKey: key } },
      });
      if (previous) {
        await tx.feedbackForm.update({
          where: { id },
          data: { responseCount: { decrement: 1 } },
        });
        if (followupToken) {
          const existing = await tx.followupConversation.findUnique({ where: { entryId: previous.id }, select: { tokenHash: true } });
          if (existing?.tokenHash === digest(followupToken)) followupLink = `/follow-up#${followupToken}`;
        }
      } else {
        await consumeSubmission(tx, target.accountId, undefined, id);
        await tx.feedbackEntry.create({
          data: {
            formId: id,
            requestKey: key,
            shareAllowed:
              current!.allowSharing && form.get("shareAllowed") === "on",
            answers: { create: answers },
            ...(followupToken ? { followup: { create: {
              accountId: target.accountId, tokenHash: digest(followupToken),
              expiresAt: new Date(Date.now() + FOLLOWUP_DAYS * 86400000),
            } } } : {}),
          },
        });
        if (followupToken) followupLink = `/follow-up#${followupToken}`;
        createdEntry=true;
      }
      thankYou = current!.thankYou;
    }, { isolationLevel: 'ReadCommitted' });
    if(createdEntry)recordMilestone(target.accountId,'response');
    refresh(id);
    scheduleEmails();
    return { success: thankYou, ...(followupLink ? { followupLink } : {}) };
  } catch (error) {
    return failure(error);
  }
}
export async function deleteFeedbackEntry(
  id: string,
  _: Result,
  form: FormData,
): Promise<Result> {
  let formId = "";
  try {
    const a = await requireAccount();
    await verifyCaptcha(form, "delete");
    if (form.get("confirm") !== "DELETE")
      throw new FormInputError("Type DELETE to confirm.");
    await db().$transaction(async (tx) => {
      const entry = await tx.feedbackEntry.findFirst({
        where: { id, form: { accountId: a.id } },
        select: { formId: true },
      });
      if (!entry) throw new FormInputError("Response not found.");
      formId = entry.formId;
      await tx.feedbackForm.update({
        where: { id: formId },
        data: { responseCount: { decrement: 1 } },
      });
      await tx.feedbackEntry.delete({ where: { id } });
    });
  } catch (error) {
    return failure(error);
  }
  refresh(formId);
  return { success: "Response deleted." };
}
