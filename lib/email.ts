import "server-only";
import { after } from "next/server";
import { db } from "./db";
import { emailConfigured } from "./email-config.mjs";
import { processEmailQueue } from "./email-queue.mjs";

export function scheduleEmails() {
  if (!emailConfigured()) return;
  after(async () => {
    try {
      await processEmailQueue(db(), { limit: 1 });
    } catch {
      console.warn(
        "UnsaidBox email worker unavailable; queued emails remain for retry.",
      );
    }
  });
}

export async function emailSettings(accountId: string) {
  try {
    const preference = await db().emailPreference.findUnique({
      where: { accountId },
    });
    return {
      ready: emailConfigured(),
      newMessages: preference?.newMessages ?? false,
      moderationReports: preference?.moderationReports ?? false,
    };
  } catch {
    return { ready: false, newMessages: false, moderationReports: false };
  }
}
