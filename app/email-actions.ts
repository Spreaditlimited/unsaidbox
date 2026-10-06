"use server";
import { verifyCaptcha } from "@/lib/captcha.mjs";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { db } from "@/lib/db";
import { requireAccount, rateLimit } from "@/lib/auth";
import {
  token,
  digest,
  InputError,
  hashPassword,
  textValue,
} from "@/lib/security.mjs";
import { emailConfigured } from "@/lib/email-config.mjs";
import { queueEmail } from "@/lib/email-queue.mjs";
import { scheduleEmails } from "@/lib/email";
import type { Result } from "./actions";

function failure(error: unknown): Result {
  unstable_rethrow(error);
  return {
    error:
      error instanceof InputError
        ? error.message
        : "This could not be completed. Please try again shortly.",
  };
}
function requireEmail() {
  if (!emailConfigured())
    throw new InputError(
      "Email setup is still being completed. Please try again later.",
    );
}
function readToken(form: FormData) {
  const value = String(form.get("token") ?? "");
  if (!/^[a-f0-9]{64}$/.test(value))
    throw new InputError("This link is invalid. Please request a new one.");
  return digest(value);
}

export async function resendVerification(
  _: Result,
  form: FormData,
): Promise<Result> {
  try {
    await verifyCaptcha(form, "resendVerification");
    requireEmail();
    const account = await requireAccount(false);
    if (account.emailVerifiedAt)
      return { success: "Your email is already verified." };
    await rateLimit(`verify:${account.id}`, 3, 3600);
    const value = token();
    const tokenHash = digest(value);
    const expiresAt = new Date(Date.now() + 86400000);
    await db().$transaction(async (tx) => {
      await tx.authToken.deleteMany({
        where: { accountId: account.id, purpose: "VERIFY" },
      });
      await tx.authToken.create({
        data: {
          accountId: account.id,
          purpose: "VERIFY",
          tokenHash,
          expiresAt,
        },
      });
      await queueEmail(tx, {
        accountId: account.id,
        kind: "VERIFY",
        key: tokenHash,
        tokenHash,
        expiresAt,
        path: `/verify-email?token=${value}`,
      });
    });
    scheduleEmails();
    return {
      success:
        "Verification email queued. Check your inbox and spam folder shortly. Only the newest link works.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function verifyEmail(_: Result, form: FormData): Promise<Result> {
  try {
    await verifyCaptcha(form, "verifyEmail");
    requireEmail();
    const tokenHash = readToken(form);
    await rateLimit("verify:consume", 100, 900);
    await db().$transaction(async (tx) => {
      const item = await tx.authToken.findUnique({ where: { tokenHash } });
      if (!item || item.purpose !== "VERIFY" || item.expiresAt <= new Date())
        throw new InputError(
          "This link has expired or already been used. Request a new verification email from your dashboard.",
        );
      const consumed = await tx.authToken.deleteMany({
        where: { tokenHash, purpose: "VERIFY", expiresAt: { gt: new Date() } },
      });
      if (!consumed.count)
        throw new InputError("This link has already been used.");
      const account = await tx.account.findUnique({
        where: { id: item.accountId },
        select: { status: true, emailVerifiedAt: true },
      });
      if (!account || account.status === "SUSPENDED")
        throw new InputError(
          "This account cannot be activated. Contact hello@unsaidbox.com.",
        );
      if (!account.emailVerifiedAt) {
        const updated = await tx.account.updateMany({
          where: {
            id: item.accountId,
            status: { in: ["PENDING", "ACTIVE"] },
            emailVerifiedAt: null,
          },
          data: { emailVerifiedAt: new Date(), status: "ACTIVE" },
        });
        if (!updated.count)
          throw new InputError("Account state changed. Please try again.");
        await queueEmail(tx, {
          accountId: item.accountId,
          kind: "WELCOME",
          key: `welcome:${item.accountId}`,
          path: "/dashboard",
        });
      }
    });
    scheduleEmails();
    revalidatePath("/dashboard", "layout");
    return {
      success:
        "Email verified. Your box is ready—sign in or open your dashboard to continue.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function requestPasswordReset(
  _: Result,
  form: FormData,
): Promise<Result> {
  try {
    await verifyCaptcha(form, "requestPasswordReset");
    requireEmail();
    const email = textValue(form.get("email"), "Email", 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new InputError("Enter a valid email address.");
    await rateLimit("reset:global", 30, 3600);
    await rateLimit(`reset:${email}`, 3, 3600);
    const account = await db().account.findUnique({
      where: { email },
      select: { id: true, status: true },
    });
    if (account && account.status !== "SUSPENDED") {
      const value = token();
      const tokenHash = digest(value);
      const expiresAt = new Date(Date.now() + 1800000);
      await db().$transaction(async (tx) => {
        await tx.authToken.deleteMany({
          where: { accountId: account.id, purpose: "RESET" },
        });
        await tx.authToken.create({
          data: {
            accountId: account.id,
            purpose: "RESET",
            tokenHash,
            expiresAt,
          },
        });
        await queueEmail(tx, {
          accountId: account.id,
          kind: "RESET",
          key: tokenHash,
          tokenHash,
          expiresAt,
          path: `/reset-password?token=${value}`,
        });
      });
      scheduleEmails();
    }
    return {
      success:
        "If an eligible account uses that email, a reset link will arrive shortly. Check your spam folder too.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function resetPassword(
  _: Result,
  form: FormData,
): Promise<Result> {
  try {
    await verifyCaptcha(form, "resetPassword");
    requireEmail();
    const tokenHash = readToken(form);
    await rateLimit("reset:consume", 50, 900);
    if (form.get("password") !== form.get("confirmation"))
      throw new InputError("The passwords do not match.");
    const passwordHash = await hashPassword(form.get("password"));
    await db().$transaction(async (tx) => {
      const item = await tx.authToken.findUnique({ where: { tokenHash } });
      if (!item || item.purpose !== "RESET" || item.expiresAt <= new Date())
        throw new InputError(
          "This link has expired or already been used. Request a new password reset.",
        );
      const consumed = await tx.authToken.deleteMany({
        where: { tokenHash, purpose: "RESET", expiresAt: { gt: new Date() } },
      });
      if (!consumed.count)
        throw new InputError("This link has already been used.");
      const changed = await tx.account.updateMany({
        where: { id: item.accountId, status: { not: "SUSPENDED" } },
        data: { passwordHash },
      });
      if (!changed.count)
        throw new InputError(
          "This account cannot be changed. Contact hello@unsaidbox.com.",
        );
      await tx.session.deleteMany({ where: { accountId: item.accountId } });
      await tx.authToken.deleteMany({
        where: { accountId: item.accountId, purpose: "RESET" },
      });
      await queueEmail(tx, {
        accountId: item.accountId,
        kind: "PASSWORD_CHANGED",
        key: `reset-done:${tokenHash}`,
        path: "/forgot-password",
      });
    });
    scheduleEmails();
    return {
      success:
        "Password reset. All existing sessions have been signed out. Sign in with your new password.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function saveEmailPreferences(
  _: Result,
  form: FormData,
): Promise<Result> {
  try {
    await verifyCaptcha(form, "saveEmailPreferences");
    requireEmail();
    const account = await requireAccount();
    const newMessages = form.get("newMessages") === "on";
    // Personal accounts no longer configure administrative notifications.
    const moderationReports = false;
    if ((newMessages || moderationReports) && !account.emailVerifiedAt)
      throw new InputError("Verify your email before enabling notifications.");
    await db().emailPreference.upsert({
      where: { accountId: account.id },
      create: { accountId: account.id, newMessages, moderationReports },
      update: { newMessages, moderationReports },
    });
    revalidatePath("/dashboard/settings");
    return { success: "Email preferences saved." };
  } catch (error) {
    return failure(error);
  }
}
