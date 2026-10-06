import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { readFile, open, rename, unlink, lstat } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { parseEnv } from "node:util";
import { emailConfig } from "../lib/email-config.mjs";
import nodemailer from "nodemailer";

const destination = new URL("../.env", import.meta.url);
const temporary = new URL(
  `../.env.email-${randomBytes(8).toString("hex")}`,
  import.meta.url,
);
let rl,
  file,
  muted = false,
  transport;
const output = new Writable({
  write(chunk, encoding, done) {
    if (!muted) process.stdout.write(chunk, encoding);
    done();
  },
});
try {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("TTY");
  const stat = await lstat(destination);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("ENV");
  const previous = await readFile(destination, "utf8");
  const existing = parseEnv(previous);
  rl = createInterface({
    input: process.stdin,
    output,
    terminal: true,
    historySize: 0,
  });
  rl.on("SIGINT", () => {
    process.stdout.write("\nCancelled.\n");
    process.exit(130);
  });
  console.log(
    "Configure hello@unsaidbox.com using Hostinger SMTP with verified TLS. Database settings are preserved.",
  );
  const origin =
    (
      await rl.question(
        `App URL [${existing.UNSAIDBOX_APP_URL || "http://127.0.0.1:3001"}]: `,
      )
    ).trim() ||
    existing.UNSAIDBOX_APP_URL ||
    "http://127.0.0.1:3001";
  console.log(
    "Use your Mac’s LAN URL if you will open email links on your phone. Use https://unsaidbox.com only when it is deployed.",
  );
  process.stdout.write("Hostinger mailbox password (hidden): ");
  muted = true;
  const password = await rl.question("");
  muted = false;
  process.stdout.write("\n");
  const env = {
    UNSAIDBOX_EMAIL_ENABLED:
      existing.UNSAIDBOX_EMAIL_ENABLED === "true" ? "true" : "false",
    UNSAIDBOX_APP_URL: origin,
    UNSAIDBOX_SMTP_HOST: "smtp.hostinger.com",
    UNSAIDBOX_SMTP_PORT: "465",
    UNSAIDBOX_SMTP_USER: "hello@unsaidbox.com",
    UNSAIDBOX_SMTP_PASSWORD: password,
    // Never rotate an existing key automatically: queued links depend on it.
    UNSAIDBOX_EMAIL_KEY:
      existing.UNSAIDBOX_EMAIL_KEY || randomBytes(32).toString("hex"),
    UNSAIDBOX_EMAIL_WORKER_SECRET:
      existing.UNSAIDBOX_EMAIL_WORKER_SECRET || randomBytes(32).toString("hex"),
  };
  const config = emailConfig(env);
  transport = nodemailer.createTransport(config.smtp);
  await transport.verify();
  // Base64 avoids dotenv interpreting passwords containing quotes, # or newlines.
  // The application decodes this value on the server; it is still a secret.
  const stored = {
    ...env,
    UNSAIDBOX_SMTP_PASSWORD_B64: Buffer.from(password).toString("base64"),
  };
  delete stored.UNSAIDBOX_SMTP_PASSWORD;
  const keys = new Set([...Object.keys(stored), "UNSAIDBOX_SMTP_PASSWORD"]);
  const retained = previous
    .split(/\r?\n/)
    .filter(
      (line) =>
        !keys.has(line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=/)?.[1]),
    )
    .join("\n")
    .trimEnd();
  const content = `${retained}\n\n# UnsaidBox email — private, server-only\n${Object.entries(
    stored,
  )
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join("\n")}\n`;
  file = await open(temporary, "wx", 0o600);
  await file.writeFile(content, "utf8");
  await file.close();
  file = null;
  if ((await readFile(destination, "utf8")) !== previous)
    throw new Error("ENV_CHANGED");
  await rename(temporary, destination);
  console.log(
    "SMTP authentication and TLS verified. Settings saved privately; database configuration preserved.",
  );
  console.log(
    "No email was sent. New installations stay disabled until the email tables are installed.",
  );
  console.log(
    "After installing the tables, run npm run email:enable, restart npm run dev, then run npm run email:test.",
  );
} catch {
  muted = false;
  console.error(
    "Email setup did not finish. Check the mailbox password, network and .env file. No credentials printed. Existing .env was not overwritten unless setup completed.",
  );
  process.exitCode = 1;
} finally {
  rl?.close();
  transport?.close();
  await file?.close();
  await unlink(temporary).catch(() => {});
}
