import nodemailer from "nodemailer";
import { emailConfig, sender } from "./email-config.mjs";
import { renderEmail } from "./email-templates.mjs";
import { contactEmail } from "./contact.mjs";

export async function sendContactEmail(details, id) {
  const transport = nodemailer.createTransport(emailConfig().smtp);
  try {
    const result = await transport.sendMail({
      from: sender,
      to: sender,
      replyTo: { address: details.email, name: details.name },
      messageId: `<contact-${id}@unsaidbox.com>`,
      ...contactEmail(details),
    });
    if (!result.accepted?.length || result.rejected?.length)
      throw new Error("EMAIL_REJECTED");
  } finally {
    transport.close();
  }
}

export async function verifyEmailConnection() {
  const transport = nodemailer.createTransport(emailConfig().smtp);
  try {
    return await transport.verify();
  } finally {
    transport.close();
  }
}

export async function sendEmail({ kind, to, name, url, id }) {
  if (typeof to !== "string" || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to))
    throw new Error("EMAIL_RECIPIENT");
  const config = emailConfig();
  const transport = nodemailer.createTransport(config.smtp);
  try {
    const result = await transport.sendMail({
      from: sender,
      replyTo: sender,
      to: { address: to, name: "" },
      messageId: `<${id}@unsaidbox.com>`,
      ...renderEmail(kind, { name, url, origin: config.origin }),
    });
    if (!result.accepted?.length || result.rejected?.length)
      throw new Error("EMAIL_REJECTED");
  } finally {
    transport.close();
  }
}

export function safeEmailError(error) {
  if (error?.code === "EAUTH") return "SMTP_AUTH";
  if (error?.responseCode >= 500) return "SMTP_REJECTED";
  if (["ETIMEDOUT", "ECONNECTION", "ESOCKET", "EDNS"].includes(error?.code))
    return "SMTP_CONNECTION";
  return "EMAIL_FAILED";
}
