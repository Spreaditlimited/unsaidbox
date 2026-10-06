import { randomBytes } from "node:crypto";
import { PrismaClient } from "../generated/prisma/index.js";
import { validateDatabaseUrl } from "../lib/database-url.mjs";
import { emailConfig, sender } from "../lib/email-config.mjs";
import {
  verifyEmailConnection,
  sendEmail,
  safeEmailError,
} from "../lib/email-transport.mjs";
import { processEmailQueue } from "../lib/email-queue.mjs";
import { readFile, open, rename, unlink } from "node:fs/promises";
import { parseEnv } from "node:util";

let client;
try {
  const config = emailConfig();
  const command = process.argv[2];
  if (command === "test") {
    // Deliberately fixed recipient: never email an existing customer as a smoke test.
    await sendEmail({
      kind: "TEST",
      to: sender.address,
      name: "UnsaidBox team",
      url: config.origin,
      id: `test-${randomBytes(12).toString("hex")}`,
    });
    console.log(
      "Hostinger accepted the branded test addressed to hello@unsaidbox.com. Check webmail and spam to confirm receipt.",
    );
  } else {
    client = new PrismaClient({
      datasources: {
        db: { url: validateDatabaseUrl(process.env.UNSAIDBOX_DATABASE_URL) },
      },
    });
    if (command === "check" || command === "enable") {
      await verifyEmailConnection();
      await client.emailPreference.count();
      await client.emailDelivery.count();
      console.log(
        "SMTP authentication, verified TLS and both email database tables are ready. No email sent.",
      );
      if (command === "enable") {
        const path = new URL("../.env", import.meta.url);
        const previous = await readFile(path, "utf8");
        const saved = parseEnv(previous);
        // Do not enable a different environment than the one just checked.
        for (const key of [
          "UNSAIDBOX_DATABASE_URL",
          "UNSAIDBOX_SMTP_PASSWORD_B64",
          "UNSAIDBOX_SMTP_PASSWORD",
          "UNSAIDBOX_APP_URL",
          "UNSAIDBOX_EMAIL_KEY",
          "UNSAIDBOX_SMTP_HOST",
          "UNSAIDBOX_SMTP_PORT",
          "UNSAIDBOX_SMTP_USER",
          "UNSAIDBOX_EMAIL_WORKER_SECRET",
        ])
          if (saved[key] !== process.env[key]) throw new Error("ENV_CHANGED");
        const content =
          previous
            .replace(/^\s*(?:export\s+)?UNSAIDBOX_EMAIL_ENABLED\s*=.*$/gm, "")
            .trimEnd() + '\nUNSAIDBOX_EMAIL_ENABLED="true"\n';
        const temporary = new URL(
          `../.env.enable-${randomBytes(8).toString("hex")}`,
          import.meta.url,
        );
        let handle;
        try {
          handle = await open(temporary, "wx", 0o600);
          await handle.writeFile(content);
          await handle.close();
          handle = null;
          if ((await readFile(path, "utf8")) !== previous)
            throw new Error("ENV_CHANGED");
          await rename(temporary, path);
        } finally {
          await handle?.close();
          await unlink(temporary).catch(() => {});
        }
        console.log(
          "Email enabled locally. Restart npm run dev and run npm run email:worker -- --watch in another terminal.",
        );
      }
    } else if (command === "worker") {
      if (process.env.UNSAIDBOX_EMAIL_ENABLED !== "true")
        throw new Error("EMAIL_DISABLED");
      do {
        console.log(await processEmailQueue(client, { limit: 3 }));
        if (!process.argv.includes("--watch")) break;
        await new Promise((resolve) => setTimeout(resolve, 60000));
      } while (true);
    } else if (command === "status") {
      console.log(
        await client.emailDelivery.groupBy({
          by: ["status"],
          _count: { _all: true },
        }),
      );
      console.log(
        "SENT means accepted by SMTP, not confirmed inbox delivery. No recipients, messages or tokens printed.",
      );
    } else throw new Error("COMMAND");
  }
} catch (error) {
  console.error(
    `Email check stopped (${safeEmailError(error)}). Check private SMTP settings, the database tunnel and email migration. No secrets printed.`,
  );
  process.exitCode = 1;
} finally {
  await client?.$disconnect();
}
