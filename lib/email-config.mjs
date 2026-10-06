import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export const sender = { name: "UnsaidBox", address: "hello@unsaidbox.com" };

export function appOrigin(env = process.env) {
  const url = new URL(env.UNSAIDBOX_APP_URL || "");
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    !["https:", "http:"].includes(url.protocol) ||
    (env.NODE_ENV === "production" && url.protocol !== "https:")
  ) {
    throw new Error("EMAIL_CONFIG");
  }
  return url.origin;
}

export function emailConfig(env = process.env) {
  const origin = appOrigin(env);
  const port = Number(env.UNSAIDBOX_SMTP_PORT || 465);
  const password = env.UNSAIDBOX_SMTP_PASSWORD_B64
    ? Buffer.from(env.UNSAIDBOX_SMTP_PASSWORD_B64, "base64").toString("utf8")
    : env.UNSAIDBOX_SMTP_PASSWORD;
  if (
    env.UNSAIDBOX_SMTP_HOST !== "smtp.hostinger.com" ||
    env.UNSAIDBOX_SMTP_USER !== sender.address ||
    !password ||
    /[\r\n\0]/.test(password) ||
    ![465, 587].includes(port) ||
    !/^[a-f0-9]{64}$/.test(env.UNSAIDBOX_EMAIL_KEY || "")
  ) {
    throw new Error("EMAIL_CONFIG");
  }
  return {
    origin,
    key: Buffer.from(env.UNSAIDBOX_EMAIL_KEY, "hex"),
    smtp: {
      host: env.UNSAIDBOX_SMTP_HOST,
      port,
      secure: port === 465,
      requireTLS: true,
      auth: { user: sender.address, pass: password },
      tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
      dnsTimeout: 5000,
      disableFileAccess: true,
      disableUrlAccess: true,
      logger: false,
      debug: false,
    },
  };
}

export function emailConfigured(env = process.env) {
  if (env.UNSAIDBOX_EMAIL_ENABLED !== "true") return false;
  try {
    emailConfig(env);
    return true;
  } catch {
    return false;
  }
}

export function sealEmail(value, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64");
}

export function openEmail(value, key) {
  const data = Buffer.from(value, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([
      decipher.update(data.subarray(28)),
      decipher.final(),
    ]).toString("utf8"),
  );
}
