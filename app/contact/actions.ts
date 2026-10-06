"use server";
import { randomUUID } from "node:crypto";
import { unstable_rethrow } from "next/navigation";
import { rateLimit } from "@/lib/auth";
import { InputError } from "@/lib/security.mjs";
import { verifyCaptcha } from "@/lib/captcha.mjs";
import { contactValues } from "@/lib/contact.mjs";
import { emailConfigured } from "@/lib/email-config.mjs";
import { sendContactEmail } from "@/lib/email-transport.mjs";
import type { Result } from "@/app/actions";

export async function sendContact(_: Result, form: FormData): Promise<Result> {
  try {
    const details = contactValues(form);
    await rateLimit("contact:global", 10, 3600);
    await rateLimit(`contact:${details.email}`, 2, 3600);
    await verifyCaptcha(form, "sendContact");
    if (!emailConfigured())
      throw new InputError(
        "The contact form is temporarily unavailable. Please email hello@unsaidbox.com directly.",
      );
    await sendContactEmail(details, randomUUID());
    return {
      success:
        "Your enquiry has been submitted for email delivery to our support team. We’ll use the address you provided to reply.",
    };
  } catch (error) {
    unstable_rethrow(error);
    return {
      error:
        error instanceof InputError
          ? error.message
          : "We could not confirm your enquiry was sent. Please try again or email hello@unsaidbox.com directly.",
    };
  }
}
