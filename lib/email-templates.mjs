const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

// Static copy only: anonymous messages, question bodies and report reasons never enter emails.
const templates = {
  VERIFY: [
    "Confirm your UnsaidBox email",
    "Your box is almost ready.",
    "Confirm your email to activate your private inbox and start collecting anonymous messages.",
    "Confirm email",
    "This link expires in 24 hours and can be used once. If you did not create this account, you can ignore this email.",
  ],
  RESET: [
    "Reset your UnsaidBox password",
    "A fresh start.",
    "Use the secure link below to choose a new password for your UnsaidBox account.",
    "Reset password",
    "This link expires in 30 minutes and can be used once. If you did not request it, your password has not changed; you can ignore this email.",
  ],
  WELCOME: [
    "Welcome to UnsaidBox",
    "Make room for honesty.",
    "Your email is verified and your box is ready. Share your inbox link, ask your audience a question, and decide what stays private. Nothing is published automatically.",
    "Open your dashboard",
    "You received this one-time welcome because you verified your UnsaidBox account.",
  ],
  PASSWORD_CHANGED: [
    "Your UnsaidBox password was changed",
    "Your account, kept secure.",
    "Your password was updated and previous sessions were signed out. If this was not you, reset your password now and contact hello@unsaidbox.com.",
    "Secure my account",
    "This is an essential account-security notice.",
  ],
  NEW_MESSAGE: [
    "Something new in your UnsaidBox",
    "Someone left you a message.",
    "There is new activity in your private inbox. Open your dashboard to read it and decide what to do next. Message content stays out of email.",
    "Open your inbox",
    "You enabled inbox notifications. We send at most one activity notification per hour.",
  ],
  NEW_ANSWER: [
    "A new answer in your UnsaidBox",
    "Your question started something.",
    "Someone responded to one of your questions. Read the answer privately in your dashboard. Nothing has been published automatically.",
    "Read your answers",
    "You enabled inbox notifications. We send at most one activity notification per hour.",
  ],
  REPORT: [
    "A report needs review on UnsaidBox",
    "A moment for moderation.",
    "A public-content report is waiting in the moderation dashboard. Review it before taking any action.",
    "Review reports",
    "You enabled moderation notifications as an UnsaidBox administrator.",
  ],
  SUSPENDED: [
    "An update about your UnsaidBox account",
    "Your account has been paused.",
    "Your account has been suspended by an administrator. Your public pages and inbox are unavailable. Reply to this email if you believe this was a mistake.",
    "Contact support",
    "This is an essential account-status notice.",
  ],
  RESTORED: [
    "An update about your UnsaidBox account",
    "You can sign in again.",
    "An administrator has restored access to your UnsaidBox account. Sign in to review your box and settings.",
    "Sign in",
    "This is an essential account-status notice.",
  ],
  TEST: [
    "UnsaidBox email setup test",
    "A little hello from UnsaidBox.",
    "This is a test of the branded email setup for hello@unsaidbox.com. No account settings were changed.",
    "Visit UnsaidBox",
    "This test was requested by the UnsaidBox operator.",
  ],
};

export function renderEmail(kind, { name = "", url, origin }) {
  const copy = templates[kind];
  if (!copy) throw new Error("EMAIL_KIND");
  const destination = new URL(url);
  if (destination.origin !== origin && url !== "mailto:hello@unsaidbox.com")
    throw new Error("EMAIL_LINK");
  const [subject, title, body, action, note] = copy;
  const optional = ["NEW_MESSAGE", "NEW_ANSWER", "REPORT"].includes(kind);
  const settings = `${origin}/dashboard/settings`;
  const greeting = name ? `Hi ${name},` : "Hello,";
  const text = `UnsaidBox\nMake room for honesty.\n\n${title}\n\n${greeting}\n\n${body}\n\n${action}: ${url}\n\n${note}${optional ? `\nManage email preferences: ${settings}` : ""}\n\nNeed a hand? Reply to hello@unsaidbox.com.\nUnsaidBox · Your box. Your boundaries.`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escape(subject)}</title></head><body style="margin:0;background:#faf9f6;color:#202332;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escape(title)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#faf9f6"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px"><tr><td style="padding:28px 32px;background:#27243e;border-radius:20px 20px 0 0"><a href="${escape(origin)}" style="font-size:26px;font-weight:700;color:#fff;text-decoration:none">Unsaid<span style="color:#c5bff5">Box</span></a><p style="margin:10px 0 0;color:#dedaf4;font-size:13px;letter-spacing:1px">MAKE ROOM FOR HONESTY.</p></td></tr><tr><td style="padding:32px;background:#fff;border:1px solid #eeebfa"><h1 style="font-size:27px;line-height:1.25;margin:0 0 24px;color:#202332">${escape(title)}</h1><p style="font-size:16px;line-height:1.7">${escape(greeting)}</p><p style="font-size:16px;line-height:1.7">${escape(body)}</p><table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0"><tr><td bgcolor="#5850b8" style="border-radius:9px"><a href="${escape(url)}" style="display:inline-block;padding:16px 24px;color:#fff;font-size:16px;font-weight:600;text-decoration:none;border:1px solid #5850b8;border-radius:9px">${escape(action)}</a></td></tr></table><p style="font-size:13px;line-height:1.7;color:#646476">${escape(note)}</p><p style="font-size:12px;line-height:1.7;overflow-wrap:anywhere;word-break:break-all;color:#646476">Button not working? Use this link:<br><a href="${escape(url)}" style="color:#5850b8">${escape(url)}</a></p></td></tr><tr><td style="padding:24px 32px;background:#eeebfa;border-radius:0 0 20px 20px;font-size:13px;line-height:1.8;color:#555267">Need a hand? Reply to <a href="mailto:hello@unsaidbox.com" style="color:#5850b8">hello@unsaidbox.com</a>.${optional ? `<br><a href="${escape(settings)}" style="color:#5850b8">Manage email preferences</a>` : ""}<br>UnsaidBox · Your box. Your boundaries.</td></tr></table></td></tr></table></body></html>`;
  return { subject, html, text };
}
