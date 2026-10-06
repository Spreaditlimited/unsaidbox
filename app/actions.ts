"use server";
import { verifyCaptcha } from "@/lib/captcha.mjs";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdministrator } from "@/lib/admin-auth";
import {
  beginSession,
  endSession,
  requireAccount,
  rateLimit,
} from "@/lib/auth";
import {
  InputError,
  hashPassword,
  verifyPassword,
  textValue,
  usernameValue,
  token,
  digest,
} from "@/lib/security.mjs";
import { emailConfigured } from "@/lib/email-config.mjs";
import { queueEmail, queueActivityEmail } from "@/lib/email-queue.mjs";
import { scheduleEmails } from "@/lib/email";
import { facebookPostUrl } from "@/lib/share.mjs";
import { canSubmit } from "@/lib/publishing.mjs";

export type Result = { error?: string; success?: string };
const field = (f: FormData, name: string) => f.get(name);
const checked = (f: FormData, name: string) => f.get(name) === "on";
function failure(error: unknown): Result {
  unstable_rethrow(error);
  if (error instanceof InputError) return { error: error.message };
  return {
    error:
      "The request could not be completed. Check your details and try again.",
  };
}
export async function register(_: Result, form: FormData): Promise<Result> {
  try {
    await verifyCaptcha(form, "register");
    if (!emailConfigured())
      return {
        error:
          "Email setup is still being completed. Registration will open shortly.",
      };
    await rateLimit("registration", 20, 3600);
    const email = textValue(field(form, "email"), "Email", 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new InputError("Enter a valid email address.");
    if (!checked(form, "adult"))
      throw new InputError("You must be 18 or older to create an account.");
    const account = await db().$transaction(async (tx) => {
      const created = await tx.account.create({
        select: { id: true },
        data: {
          email,
          username: usernameValue(field(form, "username")),
          displayName: textValue(
            field(form, "displayName"),
            "Display name",
            80,
          ),
          passwordHash: await hashPassword(field(form, "password")),
        },
      });
      const value = token();
      const tokenHash = digest(value);
      const expiresAt = new Date(Date.now() + 86400000);
      await tx.authToken.create({
        data: {
          accountId: created.id,
          tokenHash,
          purpose: "VERIFY",
          expiresAt,
        },
      });
      await queueEmail(tx, {
        accountId: created.id,
        kind: "VERIFY",
        key: tokenHash,
        tokenHash,
        expiresAt,
        path: `/verify-email?token=${value}`,
      });
      return created;
    });
    scheduleEmails();
    await beginSession(account.id);
  } catch (error) {
    return failure(error);
  }
  redirect("/dashboard");
}
export async function login(_: Result, form: FormData): Promise<Result> {
  try {
    await verifyCaptcha(form, "login");
    const email = textValue(field(form, "email"), "Email", 254).toLowerCase();
    await rateLimit("login:global", 100, 900);
    await rateLimit(`login:${email}`, 10, 900);
    const account = await db().account.findUnique({ where: { email } });
    // Run the password KDF even when there is no account.
    const dummy = `scrypt-v1:${"0".repeat(32)}:${"0".repeat(128)}`;
    const valid = await verifyPassword(
      field(form, "password"),
      account?.passwordHash ?? dummy,
    );
    if (!valid || !account || account.status === "SUSPENDED")
      return { error: "Email or password not recognised." };
    await beginSession(account.id);
  } catch (error) {
    return failure(error);
  }
  redirect("/dashboard");
}
export async function logout() {
  await endSession();
  redirect("/login");
}

export async function changePassword(
  _: Result,
  form: FormData,
): Promise<Result> {
  try {
    await verifyCaptcha(form, "changePassword");
    const account = await requireAccount(false);
    const credentials = await db().account.findUnique({
      where: { id: account.id },
      select: { passwordHash: true },
    });
    await rateLimit(`password:${account.id}`, 5, 900);
    if (
      !credentials ||
      !(await verifyPassword(
        field(form, "currentPassword"),
        credentials.passwordHash,
      ))
    )
      throw new InputError("Current password is incorrect.");
    const passwordHash = await hashPassword(field(form, "newPassword"));
    await db().$transaction(async (tx) => {
      // Reject a concurrent password change rather than accepting stale credentials.
      const changed = await tx.account.updateMany({
        where: { id: account.id, passwordHash: credentials.passwordHash },
        data: { passwordHash },
      });
      if (!changed.count)
        throw new InputError("Password changed elsewhere. Sign in again.");
      await tx.session.deleteMany({ where: { accountId: account.id } });
      await tx.authToken.deleteMany({ where: { accountId: account.id } });
      if (emailConfigured() && account.emailVerifiedAt)
        await queueEmail(tx, {
          accountId: account.id,
          kind: "PASSWORD_CHANGED",
          key: `password:${token()}`,
          path: "/forgot-password",
        });
    });
    scheduleEmails();
    await beginSession(account.id);
    return {
      success: "Password updated. Other sessions have been signed out.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function createQuestion(
  _: Result,
  form: FormData,
): Promise<Result> {
  let id: string;
  try {
    await verifyCaptcha(form, "createQuestion");
    const account = await requireAccount();
    await rateLimit(`questions:${account.id}`, 30, 3600);
    const question = await db().question.create({
      data: {
        accountId: account.id,
        body: textValue(field(form, "body"), "Question", 5000),
        sharingPolicy: checked(form, "privateOnly")
          ? "PRIVATE_ONLY"
          : "OWNER_MAY_SHARE",
      },
    });
    id = question.id;
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/dashboard");
  redirect(`/dashboard/questions/${id}`);
}
export async function saveQuestion(
  id: string,
  _: Result,
  form: FormData,
): Promise<Result> {
  try {
    await verifyCaptcha(form, "saveQuestion");
    const account = await requireAccount();
    const rawUrl = textValue(
      field(form, "socialPostUrl") ?? "",
      "Facebook link",
      1000,
      0,
    );
    const socialPostUrl = rawUrl ? facebookPostUrl(rawUrl) : null;
    if (rawUrl && !socialPostUrl)
      throw new InputError("Enter a valid HTTPS Facebook post link.");
    const result = await db().question.updateMany({
      where: { id, accountId: account.id },
      data: {
        body: textValue(field(form, "body"), "Question", 5000),
        linkActive: checked(form, "linkActive"),
        acceptingResponses: checked(form, "acceptingResponses"),
        publicVisible: checked(form, "publicVisible"),
        discoverable: checked(form, "discoverable"),
        discoveryApproved: false,
        socialPostUrl,
      },
    });
    if (!result.count) throw new InputError("Question not found.");
    revalidatePath("/", "layout");
    return {
      success:
        "Question saved. Public visibility and accepting answers are separate settings.",
    };
  } catch (error) {
    return failure(error);
  }
}
export async function deleteQuestion(
  id: string,
  _: Result,
  form: FormData,
): Promise<Result> {
  try {
    await verifyCaptcha(form, "delete");
    const account = await requireAccount();
    if (field(form, "confirm") !== "DELETE")
      throw new InputError("Type DELETE to confirm.");
    const result = await db().question.deleteMany({
      where: {
        id,
        accountId: account.id,
        linkActive: false,
        publicVisible: false,
      },
    });
    if (!result.count)
      throw new InputError(
        "Deactivate the link and switch public visibility off before deleting.",
      );
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
export async function submitMessage(
  username: string,
  questionId: string | null,
  _: Result,
  form: FormData,
): Promise<Result> {
  try {
    await verifyCaptcha(form, "submitMessage");
    if (field(form, "website"))
      throw new InputError("Submission could not be accepted.");
    const body = textValue(field(form, "body"), "Message", 5000);
    if (!checked(form, "consent"))
      throw new InputError("Please confirm the privacy notice before sending.");
    const account = await db().account.findUnique({
      where: { username },
      select: { id: true, status: true },
    });
    if (!account || account.status !== "ACTIVE")
      throw new InputError("This inbox is not available.");
    await rateLimit(`submit:${account.id}`, 100, 3600);
    await db().$transaction(async (tx) => {
      const owner = await tx.account.findUnique({
        where: { id: account.id },
        select: {
          id: true,
          status: true,
          inboxOpen: true,
          inboxSharingPolicy: true,
        },
      });
      if (!owner || owner.status !== "ACTIVE")
        throw new InputError("This inbox is not available.");
      const question = questionId
        ? await tx.question.findFirst({
            where: { id: questionId, accountId: owner.id },
          })
        : null;
      if (questionId ? !canSubmit(question, owner) : !owner.inboxOpen)
        throw new InputError("This link is not accepting messages.");
      const sharingPolicy = question?.sharingPolicy ?? owner.inboxSharingPolicy;
      if (field(form, "policy") !== sharingPolicy)
        throw new InputError(
          "The privacy setting changed. Reload this page and review it before sending.",
        );
      await tx.submission.create({
        data: { accountId: owner.id, questionId, body, sharingPolicy },
      });
      await queueActivityEmail(tx, owner.id, Boolean(questionId));
    });
    scheduleEmails();
    revalidatePath("/dashboard");
    return {
      success:
        "Your message has been received privately. It is not automatically published.",
    };
  } catch (error) {
    return failure(error);
  }
}
export async function saveResponse(
  id: string,
  _: Result,
  form: FormData,
): Promise<Result> {
  try {
    await verifyCaptcha(form, "saveResponse");
    const account = await requireAccount();
    const status = String(field(form, "status"));
    if (!["PENDING", "APPROVED", "ARCHIVED", "SPAM"].includes(status))
      throw new InputError("Choose a valid status.");
    await db().$transaction(async (tx) => {
      const response = await tx.submission.findFirst({
        where: { id, accountId: account.id },
      });
      if (!response) throw new InputError("Response not found.");
      const publicVisible = checked(form, "publicVisible");
      if (
        publicVisible &&
        (status !== "APPROVED" || response.sharingPolicy !== "OWNER_MAY_SHARE")
      )
        throw new InputError(
          "Only approved, shareable responses may be public.",
        );
      await tx.submission.updateMany({
        where: { id, accountId: account.id },
        data: {
          status: status as "PENDING" | "APPROVED" | "ARCHIVED" | "SPAM",
          publicVisible,
          publicBody:
            textValue(
              field(form, "publicBody") ?? "",
              "Shared text",
              5000,
              0,
            ) || null,
          ownerReply:
            textValue(field(form, "ownerReply") ?? "", "Your reply", 5000, 0) ||
            null,
        },
      });
    });
    revalidatePath("/", "layout");
    return {
      success: "Response saved. Nothing has been posted to social media.",
    };
  } catch (error) {
    return failure(error);
  }
}
export async function deleteResponse(
  id: string,
  _: Result,
  form: FormData,
): Promise<Result> {
  try {
    await verifyCaptcha(form, "delete");
    const account = await requireAccount();
    if (field(form, "confirm") !== "DELETE")
      throw new InputError("Type DELETE to confirm.");
    const result = await db().submission.deleteMany({
      where: { id, accountId: account.id, publicVisible: false },
    });
    if (!result.count)
      throw new InputError("Hide the response before deleting it.");
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
export async function saveSettings(_: Result, form: FormData): Promise<Result> {
  try {
    await verifyCaptcha(form, "saveSettings");
    const account = await requireAccount();
    await db().account.update({
      where: { id: account.id },
      data: {
        displayName: textValue(field(form, "displayName"), "Display name", 80),
        introduction: textValue(
          field(form, "introduction") ?? "",
          "Introduction",
          500,
          0,
        ),
        publicPageEnabled: checked(form, "publicPageEnabled"),
        inboxOpen: checked(form, "inboxOpen"),
        inboxSharingPolicy: checked(form, "privateOnly")
          ? "PRIVATE_ONLY"
          : "OWNER_MAY_SHARE",
      },
    });
    revalidatePath("/", "layout");
    return {
      success:
        "Settings saved. Existing messages retain their original sharing permissions.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function reportContent(
  questionId: string | null,
  submissionId: string | null,
  _: Result,
  form: FormData,
): Promise<Result> {
  try {
    await verifyCaptcha(form, "reportContent");
    await rateLimit("reports", 50, 3600);
    const reason = textValue(field(form, "reason"), "Report reason", 1000, 10);
    if (questionId) {
      const q = await db().question.findFirst({
        where: {
          id: questionId,
          linkActive: true,
          publicVisible: true,
          account: { status: "ACTIVE", publicPageEnabled: true },
        },
      });
      if (!q) throw new InputError("Content is no longer public.");
    } else if (submissionId) {
      const s = await db().submission.findFirst({
        where: {
          id: submissionId,
          publicVisible: true,
          status: "APPROVED",
          sharingPolicy: "OWNER_MAY_SHARE",
          account: { status: "ACTIVE", publicPageEnabled: true },
          OR: [
            { questionId: null },
            { question: { linkActive: true, publicVisible: true } },
          ],
        },
      });
      if (!s) throw new InputError("Content is no longer public.");
    } else throw new InputError("Content not found.");
    await db().report.create({ data: { questionId, submissionId, reason } });
    return {
      success:
        "Report received for moderator review. It has not automatically removed the content.",
    };
  } catch (error) {
    return failure(error);
  }
}
export async function moderate(
  kind: string,
  id: string,
  _: Result,
  form: FormData,
): Promise<Result> {
  try {
    await verifyCaptcha(form, "moderate");
    const actor = await requireAdministrator();
    const operation = String(field(form, "operation"));
    await db().$transaction(async (tx) => {
      if (kind === "question" && ["approve", "hide"].includes(operation)) {
        const q = await tx.question.findUnique({
          where: { id },
          include: { account: true },
        });
        if (!q) throw new InputError("Question not found.");
        if (
          operation === "approve" &&
          (!q.discoverable ||
            !q.publicVisible ||
            !q.linkActive ||
            !q.account.publicPageEnabled ||
            q.account.status !== "ACTIVE")
        )
          throw new InputError(
            "Only an opted-in public question can be approved.",
          );
        await tx.question.update({
          where: { id },
          data:
            operation === "approve"
              ? { discoveryApproved: true }
              : { discoveryApproved: false, publicVisible: false },
        });
      } else if (kind === "report" && ["resolve", "hide"].includes(operation)) {
        const report = await tx.report.findUnique({ where: { id } });
        if (!report) throw new InputError("Report not found.");
        if (operation === "hide") {
          if (report.questionId)
            await tx.question.updateMany({
              where: { id: report.questionId },
              data: { publicVisible: false, discoveryApproved: false },
            });
          if (report.submissionId)
            await tx.submission.updateMany({
              where: { id: report.submissionId },
              data: { publicVisible: false },
            });
        }
        await tx.report.update({ where: { id }, data: { status: "RESOLVED" } });
      } else throw new InputError("Invalid moderation action.");
      await tx.auditEvent.create({
        data: {
          actorId: actor.id,
          targetId: id,
          action: `${kind}:${operation}`,
        },
      });
    });
    revalidatePath("/", "layout");
    scheduleEmails();
    return { success: "Moderation action saved." };
  } catch (error) {
    return failure(error);
  }
}
