import { InputError, textValue } from "./security.mjs";

export function contactValues(form) {
  if (form.get("website"))
    throw new InputError("Your enquiry could not be submitted.");
  const name = textValue(form.get("name"), "Name", 80);
  const email = textValue(form.get("email"), "Email", 254).toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))
    throw new InputError("Enter a valid email address.");
  const subject = textValue(form.get("subject"), "Subject", 120);
  const message = textValue(form.get("message"), "Message", 5000, 10);
  if (form.get("contactNotice") !== "on")
    throw new InputError(
      "Please acknowledge that this enquiry includes your contact details.",
    );
  return { name, email, subject, message };
}

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function contactEmail({ name, email, subject, message }) {
  return {
    subject: "New UnsaidBox contact enquiry",
    text: `UnsaidBox support enquiry\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}\n\nThis is a contact-form enquiry, not an anonymous inbox message.`,
    html: `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>UnsaidBox contact enquiry</title></head><body style="margin:0;padding:24px;background:#faf9f6;font-family:Arial,sans-serif;color:#202332"><table role="presentation" style="width:100%;max-width:560px;margin:auto;border-spacing:0"><tr><td style="padding:28px;background:#27243e;color:white;border-radius:16px 16px 0 0;font-size:26px;font-weight:700">Unsaid<span style="color:#c5bff5">Box</span></td></tr><tr><td style="padding:28px;background:white;line-height:1.7"><h1 style="font-size:24px">A new support enquiry</h1><p><strong>Name:</strong> ${escape(name)}<br><strong>Email:</strong> ${escape(email)}<br><strong>Subject:</strong> ${escape(subject)}</p><p style="white-space:pre-wrap;overflow-wrap:anywhere;font-weight:400">${escape(message)}</p></td></tr><tr><td style="padding:24px;background:#eeebfa;border-radius:0 0 16px 16px;font-size:13px">Reply to this email to respond to the sender. This enquiry includes their contact details; it is not an anonymous message.</td></tr></table></body></html>`,
  };
}
