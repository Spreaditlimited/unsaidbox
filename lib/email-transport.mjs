import nodemailer from "nodemailer";
import { emailConfig, sender } from "./email-config.mjs";
import { renderEmail } from "./email-templates.mjs";
import { contactEmail } from "./contact.mjs";
import { brevo, assertSender, sendBrevoMail } from './brevo.mjs';

export async function sendContactEmail(details, id) {
  if (emailConfig().provider==='brevo') return sendBrevoMail({to:sender.address,...contactEmail(details),tag:'unsaidbox-contact',replyTo:{email:details.email,name:details.name}});
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
  if (emailConfig().provider==='brevo') {await brevo('account');await assertSender();return true;}
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
  if (config.provider==='brevo') return sendBrevoMail({to,...renderEmail(kind,{name,url,origin:config.origin}),tag:'unsaidbox-'+kind.toLowerCase()});
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
  if (['BREVO_UNCERTAIN','BREVO_REJECTED','BREVO_CONFIG'].includes(error?.message)) return error.message;
  if (error?.code === "EAUTH") return "SMTP_AUTH";
  if (error?.responseCode >= 500) return "SMTP_REJECTED";
  if (["ETIMEDOUT", "ECONNECTION", "ESOCKET", "EDNS"].includes(error?.code))
    return "SMTP_CONNECTION";
  return "EMAIL_FAILED";
}
